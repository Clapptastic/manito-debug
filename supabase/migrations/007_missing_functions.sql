-- Migration 007: Missing RPC Functions
-- This migration creates the missing RPC functions that are required by the application

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create execute_sql function for raw SQL execution
CREATE OR REPLACE FUNCTION execute_sql(
  sql_query TEXT,
  sql_params JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  param_array TEXT[];
  i INTEGER;
  param_value TEXT;
BEGIN
  -- Convert JSONB array to TEXT array for parameter binding
  param_array := ARRAY(
    SELECT jsonb_array_elements_text(sql_params)
  );
  
  -- Execute dynamic SQL with parameters
  EXECUTE sql_query INTO result USING VARIADIC param_array;
  
  -- If no result, return empty array
  IF result IS NULL THEN
    result := '[]'::JSONB;
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'query', sql_query
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_sql(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT, JSONB) TO anon;

-- 2. Create encrypt function for API key encryption
CREATE OR REPLACE FUNCTION encrypt(
  data TEXT,
  key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encrypted_data TEXT;
  salt TEXT;
BEGIN
  -- Generate a random salt for each encryption
  salt := encode(gen_random_bytes(16), 'hex');
  
  -- Encrypt the data using AES-256-CBC with the provided key and salt
  encrypted_data := encode(
    encrypt_iv(
      data::bytea, 
      digest(key || salt, 'sha256'), 
      decode(salt, 'hex'),
      'aes-cbc'
    ), 
    'base64'
  );
  
  -- Return salt + encrypted data (salt is needed for decryption)
  RETURN salt || ':' || encrypted_data;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Encryption failed: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION encrypt(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt(TEXT, TEXT) TO anon;

-- 3. Create decrypt function for API key decryption
CREATE OR REPLACE FUNCTION decrypt(
  encrypted_data TEXT,
  key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  salt TEXT;
  actual_encrypted_data TEXT;
  decrypted_data TEXT;
BEGIN
  -- Split the encrypted data to extract salt and actual encrypted data
  salt := split_part(encrypted_data, ':', 1);
  actual_encrypted_data := split_part(encrypted_data, ':', 2);
  
  -- Decrypt the data using the same key and salt
  decrypted_data := convert_from(
    decrypt_iv(
      decode(actual_encrypted_data, 'base64'),
      digest(key || salt, 'sha256'),
      decode(salt, 'hex'),
      'aes-cbc'
    ),
    'utf8'
  );
  
  RETURN decrypted_data;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Decryption failed: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION decrypt(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt(TEXT, TEXT) TO anon;

-- 4. Create a safer version of execute_sql with parameter validation
CREATE OR REPLACE FUNCTION execute_sql_safe(
  sql_query TEXT,
  sql_params JSONB DEFAULT '[]'::JSONB,
  allowed_tables TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  table_name TEXT;
  param_array TEXT[];
BEGIN
  -- Validate SQL query for security
  IF allowed_tables IS NOT NULL THEN
    -- Check if query only references allowed tables
    FOR table_name IN 
      SELECT unnest(allowed_tables)
    LOOP
      IF sql_query ILIKE '%' || table_name || '%' THEN
        -- Table is allowed, continue
        CONTINUE;
      END IF;
    END LOOP;
    
    -- If we get here and allowed_tables is specified, the query doesn't match any allowed table
    IF allowed_tables IS NOT NULL THEN
      RAISE EXCEPTION 'SQL query references unauthorized tables';
    END IF;
  END IF;
  
  -- Prevent dangerous operations
  IF sql_query ILIKE '%DROP%' OR sql_query ILIKE '%DELETE%' OR sql_query ILIKE '%TRUNCATE%' THEN
    RAISE EXCEPTION 'Dangerous SQL operations are not allowed';
  END IF;
  
  -- Convert JSONB array to TEXT array for parameter binding
  param_array := ARRAY(
    SELECT jsonb_array_elements_text(sql_params)
  );
  
  -- Execute dynamic SQL with parameters
  EXECUTE sql_query INTO result USING VARIADIC param_array;
  
  -- If no result, return empty array
  IF result IS NULL THEN
    result := '[]'::JSONB;
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'query', sql_query
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_sql_safe(TEXT, JSONB, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql_safe(TEXT, JSONB, TEXT[]) TO anon;

-- 5. Create a function to test encryption/decryption
CREATE OR REPLACE FUNCTION test_encryption()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_data TEXT := 'test-api-key-12345';
  test_key TEXT := 'test-encryption-key';
  encrypted TEXT;
  decrypted TEXT;
BEGIN
  -- Test encryption
  encrypted := encrypt(test_data, test_key);
  
  -- Test decryption
  decrypted := decrypt(encrypted, test_key);
  
  -- Verify the result
  IF decrypted = test_data THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Encryption/decryption test passed',
      'original', test_data,
      'encrypted', encrypted,
      'decrypted', decrypted
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Encryption/decryption test failed',
      'original', test_data,
      'encrypted', encrypted,
      'decrypted', decrypted
    );
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION test_encryption() TO authenticated;
GRANT EXECUTE ON FUNCTION test_encryption() TO anon;

-- 6. Create a function to get function status
CREATE OR REPLACE FUNCTION get_function_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  functions JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'function_name', p.proname,
      'schema_name', n.nspname,
      'language', l.lanname,
      'return_type', pg_get_function_result(p.oid),
      'argument_types', pg_get_function_arguments(p.oid)
    )
  ) INTO functions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_language l ON p.prolang = l.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'execute_sql',
      'execute_sql_safe', 
      'encrypt',
      'decrypt',
      'test_encryption',
      'search_similar_chunks',
      'search_code_chunks',
      'find_symbol_definitions',
      'find_symbol_references',
      'get_dependency_graph'
    );
  
  RETURN jsonb_build_object(
    'functions', functions,
    'total_count', jsonb_array_length(functions),
    'timestamp', now()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_function_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_function_status() TO anon;

-- 7. Add comments for documentation
COMMENT ON FUNCTION execute_sql(TEXT, JSONB) IS 'Execute raw SQL queries with parameters (use with caution)';
COMMENT ON FUNCTION execute_sql_safe(TEXT, JSONB, TEXT[]) IS 'Execute SQL queries with table restrictions for security';
COMMENT ON FUNCTION encrypt(TEXT, TEXT) IS 'Encrypt text data using AES-256-CBC with salt';
COMMENT ON FUNCTION decrypt(TEXT, TEXT) IS 'Decrypt text data using AES-256-CBC with salt';
COMMENT ON FUNCTION test_encryption() IS 'Test encryption/decryption functionality';
COMMENT ON FUNCTION get_function_status() IS 'Get status of all RPC functions';

-- 8. Log migration completion
INSERT INTO audit_log (event_type, message, user_id, metadata) 
VALUES (
    'MIGRATION_COMPLETED', 
    'Missing RPC functions migration completed', 
    'system',
    '{"migration": "007_missing_functions", "version": "2.2.0", "functions_added": ["execute_sql", "encrypt", "decrypt", "execute_sql_safe", "test_encryption", "get_function_status"]}'
);
