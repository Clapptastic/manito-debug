-- Fix the get_dependency_graph function in manito_dev database

-- Drop the existing function to recreate it
DROP FUNCTION IF EXISTS manito_dev.get_dependency_graph(INTEGER, INTEGER);

-- Create corrected function for manito_dev schema
CREATE OR REPLACE FUNCTION manito_dev.get_dependency_graph(
  project_filter INTEGER,
  max_depth INTEGER DEFAULT 3
)
RETURNS TABLE(
  from_node_id UUID,
  to_node_id UUID,
  from_name TEXT,
  to_name TEXT,
  from_type TEXT,
  to_type TEXT,
  relationship TEXT,
  weight DOUBLE PRECISION,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dep_graph AS (
    -- Base case: direct dependencies
    SELECT 
      ge.from_node_id,
      ge.to_node_id,
      gn1.name::TEXT as from_name,
      gn2.name::TEXT as to_name,
      gn1.type::TEXT as from_type,
      gn2.type::TEXT as to_type,
      ge.relationship::TEXT,
      ge.weight::DOUBLE PRECISION,
      1 as depth
    FROM manito_dev.graph_edges ge
    JOIN manito_dev.graph_nodes gn1 ON ge.from_node_id = gn1.id
    JOIN manito_dev.graph_nodes gn2 ON ge.to_node_id = gn2.id
    WHERE gn1.project_id = project_filter -- Fixed: use parameter name
    
    UNION ALL
    
    -- Recursive case: transitive dependencies
    SELECT 
      dg.from_node_id,
      ge.to_node_id,
      dg.from_name,
      gn.name::TEXT as to_name,
      dg.from_type,
      gn.type::TEXT as to_type,
      ge.relationship::TEXT,
      (ge.weight * 0.8)::DOUBLE PRECISION as weight, -- Reduce weight for indirect dependencies
      dg.depth + 1
    FROM dep_graph dg
    JOIN manito_dev.graph_edges ge ON dg.to_node_id = ge.from_node_id
    JOIN manito_dev.graph_nodes gn ON ge.to_node_id = gn.id
    WHERE dg.depth < max_depth
  )
  SELECT * FROM dep_graph
  ORDER BY depth, weight DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION manito_dev.get_dependency_graph IS 'Generate dependency graph for manito_dev schema with INTEGER project IDs';

-- Create some test data if needed
DO $$
DECLARE
  test_project_id INTEGER;
  file_node_id UUID;
  func_node_id UUID;
  class_node_id UUID;
BEGIN
  -- Check if we have a project to work with
  SELECT id INTO test_project_id FROM manito_dev.projects LIMIT 1;
  
  IF test_project_id IS NULL THEN
    -- Create a test project
    INSERT INTO manito_dev.projects (name, path, description) 
    VALUES ('Test Project', '/test', 'Test project for dependency graph')
    RETURNING id INTO test_project_id;
    
    -- Create test nodes
    INSERT INTO manito_dev.graph_nodes (type, name, path, project_id)
    VALUES ('file', 'test.js', '/test/test.js', test_project_id)
    RETURNING id INTO file_node_id;
    
    INSERT INTO manito_dev.graph_nodes (type, name, path, project_id)
    VALUES ('function', 'testFunction', '/test/test.js', test_project_id)
    RETURNING id INTO func_node_id;
    
    INSERT INTO manito_dev.graph_nodes (type, name, path, project_id)
    VALUES ('class', 'TestClass', '/test/test.js', test_project_id)
    RETURNING id INTO class_node_id;
    
    -- Create test edges
    INSERT INTO manito_dev.graph_edges (from_node_id, to_node_id, relationship, weight)
    VALUES 
      (file_node_id, func_node_id, 'contains', 1.0),
      (file_node_id, class_node_id, 'contains', 1.0),
      (func_node_id, class_node_id, 'uses', 0.8);
      
    RAISE NOTICE 'Created test project with ID: %', test_project_id;
  ELSE
    RAISE NOTICE 'Using existing project with ID: %', test_project_id;
  END IF;
END $$;
