// Tree Conversion Tests - Proving Our Magic Works Perfectly
import { 
  treeToFlat, 
  flatToTree, 
  canMoveElement, 
  calculateNewPosition,
  findElementById,
  getAllDescendants,
  getDirectChildren,
  visualizeFlat,
  type FlatXMLElement
} from '../tree-conversion';
import type { XMLElement } from '@/components/PromptBuilder';

// Test data that mimics real XML structures
const createMockTree = (): XMLElement[] => [
  {
    id: 'root-1',
    tagName: 'document',
    content: 'Main document',
    collapsed: false,
    isVisible: true,
    children: [
      {
        id: 'child-1-1',
        tagName: 'section',
        content: 'First section',
        collapsed: false,
        isVisible: true,
        children: [
          {
            id: 'grandchild-1-1-1',
            tagName: 'paragraph',
            content: 'First paragraph',
            collapsed: false,
            isVisible: true,
            children: []
          },
          {
            id: 'grandchild-1-1-2',
            tagName: 'paragraph',
            content: 'Second paragraph',
            collapsed: false,
            isVisible: true,
            children: []
          }
        ]
      },
      {
        id: 'child-1-2',
        tagName: 'section',
        content: 'Second section',
        collapsed: true,
        isVisible: false,
        children: []
      }
    ]
  },
  {
    id: 'root-2',
    tagName: 'footer',
    content: 'Footer content',
    collapsed: false,
    isVisible: true,
    children: []
  }
];

const createExpectedFlat = (): FlatXMLElement[] => [
  {
    id: 'root-1',
    tagName: 'document',
    content: 'Main document',
    depth: 0,
    parentId: null,
    ancestorIds: [],
    order: 0,
    collapsed: false,
    isVisible: true
  },
  {
    id: 'child-1-1',
    tagName: 'section',
    content: 'First section',
    depth: 1,
    parentId: 'root-1',
    ancestorIds: ['root-1'],
    order: 0,
    collapsed: false,
    isVisible: true
  },
  {
    id: 'grandchild-1-1-1',
    tagName: 'paragraph',
    content: 'First paragraph',
    depth: 2,
    parentId: 'child-1-1',
    ancestorIds: ['root-1', 'child-1-1'],
    order: 0,
    collapsed: false,
    isVisible: true
  },
  {
    id: 'grandchild-1-1-2',
    tagName: 'paragraph',
    content: 'Second paragraph',
    depth: 2,
    parentId: 'child-1-1',
    ancestorIds: ['root-1', 'child-1-1'],
    order: 1,
    collapsed: false,
    isVisible: true
  },
  {
    id: 'child-1-2',
    tagName: 'section',
    content: 'Second section',
    depth: 1,
    parentId: 'root-1',
    ancestorIds: ['root-1'],
    order: 1,
    collapsed: true,
    isVisible: false
  },
  {
    id: 'root-2',
    tagName: 'footer',
    content: 'Footer content',
    depth: 0,
    parentId: null,
    ancestorIds: [],
    order: 1,
    collapsed: false,
    isVisible: true
  }
];

describe('Tree Conversion Utilities', () => {
  describe('treeToFlat', () => {
    test('converts simple tree to flat structure correctly', () => {
      const simpleTree: XMLElement[] = [
        {
          id: 'simple-1',
          tagName: 'root',
          content: 'Root element',
          collapsed: false,
          isVisible: true,
          children: []
        }
      ];

      const result = treeToFlat(simpleTree);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'simple-1',
        tagName: 'root',
        content: 'Root element',
        depth: 0,
        parentId: null,
        ancestorIds: [],
        order: 0,
        collapsed: false,
        isVisible: true
      });
    });

    test('converts complex nested tree correctly', () => {
      const tree = createMockTree();
      const result = treeToFlat(tree);
      const expected = createExpectedFlat();
      
      expect(result).toHaveLength(6);
      expect(result).toEqual(expected);
    });

    test('preserves all element properties', () => {
      const tree = createMockTree();
      const flat = treeToFlat(tree);
      
      // Check that all properties are preserved
      flat.forEach(flatElement => {
        expect(flatElement.id).toBeDefined();
        expect(flatElement.tagName).toBeDefined();
        expect(flatElement.content).toBeDefined();
        expect(typeof flatElement.depth).toBe('number');
        expect(Array.isArray(flatElement.ancestorIds)).toBe(true);
        expect(typeof flatElement.order).toBe('number');
      });
    });

    test('handles empty tree', () => {
      const result = treeToFlat([]);
      expect(result).toEqual([]);
    });

    test('correctly calculates depths', () => {
      const tree = createMockTree();
      const flat = treeToFlat(tree);
      
      expect(flat.find(el => el.id === 'root-1')?.depth).toBe(0);
      expect(flat.find(el => el.id === 'child-1-1')?.depth).toBe(1);
      expect(flat.find(el => el.id === 'grandchild-1-1-1')?.depth).toBe(2);
    });

    test('correctly tracks ancestor chains', () => {
      const tree = createMockTree();
      const flat = treeToFlat(tree);
      
      const grandchild = flat.find(el => el.id === 'grandchild-1-1-1');
      expect(grandchild?.ancestorIds).toEqual(['root-1', 'child-1-1']);
      expect(grandchild?.parentId).toBe('child-1-1');
    });
  });

  describe('flatToTree', () => {
    test('reconstructs simple flat structure to tree', () => {
      const flat: FlatXMLElement[] = [
        {
          id: 'simple-1',
          tagName: 'root',
          content: 'Root element',
          depth: 0,
          parentId: null,
          ancestorIds: [],
          order: 0,
          collapsed: false,
          isVisible: true
        }
      ];

      const result = flatToTree(flat);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'simple-1',
        tagName: 'root',
        content: 'Root element',
        collapsed: false,
        isVisible: true,
        children: []
      });
    });

    test('reconstructs complex nested structure correctly', () => {
      const flat = createExpectedFlat();
      const result = flatToTree(flat);
      const expected = createMockTree();
      
      expect(result).toEqual(expected);
    });

    test('handles empty flat array', () => {
      const result = flatToTree([]);
      expect(result).toEqual([]);
    });

    test('preserves child order correctly', () => {
      const flat = createExpectedFlat();
      const tree = flatToTree(flat);
      
      const document = tree.find(el => el.id === 'root-1');
      expect(document?.children).toHaveLength(2);
      expect(document?.children[0].id).toBe('child-1-1');
      expect(document?.children[1].id).toBe('child-1-2');
    });
  });

  describe('Round-trip conversion', () => {
    test('tree -> flat -> tree produces identical result', () => {
      const originalTree = createMockTree();
      const flat = treeToFlat(originalTree);
      const reconstructedTree = flatToTree(flat);
      
      expect(reconstructedTree).toEqual(originalTree);
    });

    test('flat -> tree -> flat produces identical result', () => {
      const originalFlat = createExpectedFlat();
      const tree = flatToTree(originalFlat);
      const reconstructedFlat = treeToFlat(tree);
      
      expect(reconstructedFlat).toEqual(originalFlat);
    });

    test('multiple round trips maintain integrity', () => {
      let tree = createMockTree();
      
      // Do multiple conversions
      for (let i = 0; i < 5; i++) {
        const flat = treeToFlat(tree);
        tree = flatToTree(flat);
      }
      
      expect(tree).toEqual(createMockTree());
    });
  });

  describe('canMoveElement', () => {
    test('allows valid moves', () => {
      const flat = createExpectedFlat();
      
      // Can move sibling to sibling
      expect(canMoveElement(flat, 'child-1-1', 'child-1-2')).toBe(true);
      
      // Can move child to different parent
      expect(canMoveElement(flat, 'grandchild-1-1-1', 'root-2')).toBe(true);
    });

    test('prevents circular dependencies', () => {
      const flat = createExpectedFlat();
      
      // Can't move parent to be child of its descendant
      expect(canMoveElement(flat, 'root-1', 'grandchild-1-1-1')).toBe(false);
      expect(canMoveElement(flat, 'child-1-1', 'grandchild-1-1-1')).toBe(false);
    });

    test('prevents moving element to itself', () => {
      const flat = createExpectedFlat();
      
      expect(canMoveElement(flat, 'root-1', 'root-1')).toBe(false);
    });

    test('handles non-existent elements', () => {
      const flat = createExpectedFlat();
      
      expect(canMoveElement(flat, 'non-existent', 'root-1')).toBe(false);
      expect(canMoveElement(flat, 'root-1', 'non-existent')).toBe(false);
    });
  });

  describe('calculateNewPosition', () => {
    test('calculates sibling position correctly', () => {
      const flat = createExpectedFlat();
      
      const beforePos = calculateNewPosition(flat, 'root-2', 'root-1', 'before');
      expect(beforePos).toEqual({
        newDepth: 0,
        newParentId: null,
        newAncestorIds: []
      });

      const afterPos = calculateNewPosition(flat, 'root-2', 'root-1', 'after');
      expect(afterPos).toEqual({
        newDepth: 0,
        newParentId: null,
        newAncestorIds: []
      });
    });

    test('calculates child position correctly', () => {
      const flat = createExpectedFlat();
      
      const childPos = calculateNewPosition(flat, 'root-2', 'child-1-1', 'child');
      expect(childPos).toEqual({
        newDepth: 2,
        newParentId: 'child-1-1',
        newAncestorIds: ['root-1', 'child-1-1']
      });
    });

    test('throws error for non-existent target', () => {
      const flat = createExpectedFlat();
      
      expect(() => {
        calculateNewPosition(flat, 'root-1', 'non-existent', 'before');
      }).toThrow('Target element non-existent not found');
    });
  });

  describe('Helper functions', () => {
    test('findElementById works correctly', () => {
      const flat = createExpectedFlat();
      
      const found = findElementById(flat, 'child-1-1');
      expect(found?.tagName).toBe('section');
      
      const notFound = findElementById(flat, 'non-existent');
      expect(notFound).toBeUndefined();
    });

    test('getAllDescendants returns all nested children', () => {
      const flat = createExpectedFlat();
      
      const descendants = getAllDescendants(flat, 'root-1');
      expect(descendants).toHaveLength(4); // 2 children + 2 grandchildren
      
      const childDescendants = getAllDescendants(flat, 'child-1-1');
      expect(childDescendants).toHaveLength(2); // 2 grandchildren
    });

    test('getDirectChildren returns only immediate children', () => {
      const flat = createExpectedFlat();
      
      const rootChildren = getDirectChildren(flat, 'root-1');
      expect(rootChildren).toHaveLength(2);
      expect(rootChildren[0].id).toBe('child-1-1');
      expect(rootChildren[1].id).toBe('child-1-2');
      
      const leafChildren = getDirectChildren(flat, 'grandchild-1-1-1');
      expect(leafChildren).toHaveLength(0);
    });

    test('visualizeFlat creates readable output', () => {
      const flat = createExpectedFlat();
      const visualization = visualizeFlat(flat);
      
      expect(visualization).toContain('<document> (root)');
      expect(visualization).toContain('  <section> (parent: root-1)');
      expect(visualization).toContain('    <paragraph> (parent: child-1-1)');
    });
  });
});

// Integration test with actual XMLElement structure
describe('Integration with XMLElement', () => {
  test('works with real XMLElement data structure', () => {
    // This mimics what would come from your actual XML builder
    const realXMLData: XMLElement[] = [
      {
        id: 'element-1692384756123',
        tagName: 'prompt',
        content: '',
        collapsed: false,
        isVisible: true,
        children: [
          {
            id: 'element-1692384756124',
            tagName: 'instruction',
            content: 'You are a helpful assistant',
            collapsed: false,
            isVisible: true,
            children: []
          },
          {
            id: 'element-1692384756125',
            tagName: 'context',
            content: 'User is building XML prompts',
            collapsed: false,
            isVisible: true,
            children: [
              {
                id: 'element-1692384756126',
                tagName: 'requirement',
                content: 'Must be valid XML',
                collapsed: false,
                isVisible: true,
                children: []
              }
            ]
          }
        ]
      }
    ];

    // Convert to flat and back
    const flat = treeToFlat(realXMLData);
    const reconstructed = flatToTree(flat);
    
    // Should be identical
    expect(reconstructed).toEqual(realXMLData);
    
    // Verify structure
    expect(flat).toHaveLength(4);
    expect(flat[0].depth).toBe(0);
    expect(flat[1].depth).toBe(1);
    expect(flat[2].depth).toBe(1);
    expect(flat[3].depth).toBe(2);
  });
});