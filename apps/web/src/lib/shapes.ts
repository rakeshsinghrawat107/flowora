import type { NodeShapeType, NodeStyle } from '@flowora/shared';

export interface ShapeDefinition {
  type: NodeShapeType;
  label: string;
  category: ShapeCategory;
  defaultWidth: number;
  defaultHeight: number;
  defaultStyle: Required<Pick<NodeStyle, 'background' | 'borderColor'>> & NodeStyle;
  hint: string;
}

export type ShapeCategory = 'Basic' | 'Flowchart' | 'ERD' | 'HLD / Cloud' | 'UML';

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  'Basic',
  'Flowchart',
  'ERD',
  'HLD / Cloud',
  'UML',
];

const base = (over: Partial<ShapeDefinition> & { type: NodeShapeType }): ShapeDefinition => ({
  label: over.type,
  category: 'Basic',
  defaultWidth: 180,
  defaultHeight: 60,
  defaultStyle: { background: '#ffffff', borderColor: '#334155', borderWidth: 1.5, fontSize: 14 },
  hint: '',
  ...over,
});

export const SHAPES: ShapeDefinition[] = [
  // Basic
  base({ type: 'rectangle', label: 'Rectangle', category: 'Basic', hint: 'Box' }),
  base({
    type: 'rounded',
    label: 'Rounded box',
    category: 'Basic',
    defaultStyle: { background: '#eff6ff', borderColor: '#2563eb', borderWidth: 1.5, fontSize: 14 },
    hint: 'Soft box',
  }),
  base({
    type: 'ellipse',
    label: 'Ellipse',
    category: 'Basic',
    defaultWidth: 160,
    defaultHeight: 80,
    hint: 'Oval',
  }),
  base({
    type: 'diamond',
    label: 'Diamond',
    category: 'Basic',
    defaultWidth: 160,
    defaultHeight: 100,
    hint: 'Rhombus',
  }),
  base({
    type: 'text',
    label: 'Text',
    category: 'Basic',
    defaultWidth: 200,
    defaultHeight: 40,
    defaultStyle: {
      background: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      fontSize: 16,
    },
    hint: 'Free text',
  }),
  // Flowchart
  base({
    type: 'terminator',
    label: 'Start / End',
    category: 'Flowchart',
    defaultWidth: 160,
    defaultHeight: 56,
    defaultStyle: { background: '#dcfce7', borderColor: '#16a34a', borderWidth: 1.5, fontSize: 14 },
    hint: 'Stadium',
  }),
  base({
    type: 'process',
    label: 'Process',
    category: 'Flowchart',
    defaultStyle: { background: '#dbeafe', borderColor: '#2563eb', borderWidth: 1.5, fontSize: 14 },
    hint: 'Step',
  }),
  base({
    type: 'decision',
    label: 'Decision',
    category: 'Flowchart',
    defaultWidth: 170,
    defaultHeight: 100,
    defaultStyle: { background: '#fef9c3', borderColor: '#ca8a04', borderWidth: 1.5, fontSize: 14 },
    hint: 'Yes / No',
  }),
  base({
    type: 'io',
    label: 'Input / Output',
    category: 'Flowchart',
    defaultStyle: { background: '#f3e8ff', borderColor: '#9333ea', borderWidth: 1.5, fontSize: 14 },
    hint: 'Parallelogram',
  }),
  base({
    type: 'document',
    label: 'Document',
    category: 'Flowchart',
    defaultStyle: { background: '#fff7ed', borderColor: '#ea580c', borderWidth: 1.5, fontSize: 14 },
    hint: 'Doc',
  }),
  // ERD
  base({
    type: 'entity',
    label: 'Entity',
    category: 'ERD',
    defaultWidth: 200,
    defaultHeight: 110,
    defaultStyle: { background: '#ecfdf5', borderColor: '#059669', borderWidth: 1.5, fontSize: 14 },
    hint: 'Table',
  }),
  base({
    type: 'attribute',
    label: 'Attribute',
    category: 'ERD',
    defaultWidth: 150,
    defaultHeight: 56,
    defaultStyle: { background: '#f0fdfa', borderColor: '#0d9488', borderWidth: 1.5, fontSize: 13 },
    hint: 'Column',
  }),
  base({
    type: 'relationship',
    label: 'Relationship',
    category: 'ERD',
    defaultWidth: 170,
    defaultHeight: 90,
    defaultStyle: { background: '#fdf2f8', borderColor: '#db2777', borderWidth: 1.5, fontSize: 14 },
    hint: 'Diamond',
  }),
  // HLD / Cloud
  base({
    type: 'service',
    label: 'Service',
    category: 'HLD / Cloud',
    defaultStyle: { background: '#eef2ff', borderColor: '#4f46e5', borderWidth: 1.5, fontSize: 14 },
    hint: 'Backend',
  }),
  base({
    type: 'api',
    label: 'API / Gateway',
    category: 'HLD / Cloud',
    defaultStyle: { background: '#f0fdf4', borderColor: '#16a34a', borderWidth: 1.5, fontSize: 14 },
    hint: 'REST',
  }),
  base({
    type: 'database',
    label: 'Database',
    category: 'HLD / Cloud',
    defaultWidth: 170,
    defaultHeight: 70,
    defaultStyle: { background: '#faf5ff', borderColor: '#7c3aed', borderWidth: 1.5, fontSize: 14 },
    hint: 'Cylinder',
  }),
  base({
    type: 'queue',
    label: 'Queue / Cache',
    category: 'HLD / Cloud',
    defaultStyle: { background: '#fffbeb', borderColor: '#d97706', borderWidth: 1.5, fontSize: 14 },
    hint: 'Kafka / Redis',
  }),
  base({
    type: 'user',
    label: 'User / Client',
    category: 'HLD / Cloud',
    defaultWidth: 120,
    defaultHeight: 110,
    defaultStyle: { background: '#f8fafc', borderColor: '#475569', borderWidth: 1.5, fontSize: 14 },
    hint: 'Actor',
  }),
  base({
    type: 'external',
    label: 'External system',
    category: 'HLD / Cloud',
    defaultStyle: { background: '#f8fafc', borderColor: '#64748b', borderWidth: 1.5, fontSize: 14 },
    hint: 'Third party',
  }),
  // UML
  base({
    type: 'class',
    label: 'Class',
    category: 'UML',
    defaultWidth: 220,
    defaultHeight: 150,
    defaultStyle: { background: '#ffffff', borderColor: '#0f172a', borderWidth: 1.5, fontSize: 14 },
    hint: 'UML class',
  }),
  base({
    type: 'actor',
    label: 'Actor',
    category: 'UML',
    defaultWidth: 110,
    defaultHeight: 130,
    defaultStyle: {
      background: 'transparent',
      borderColor: '#0f172a',
      borderWidth: 1.5,
      fontSize: 14,
    },
    hint: 'Stick figure',
  }),
  base({
    type: 'usecase',
    label: 'Use case',
    category: 'UML',
    defaultWidth: 180,
    defaultHeight: 80,
    defaultStyle: { background: '#fffbeb', borderColor: '#b45309', borderWidth: 1.5, fontSize: 14 },
    hint: 'Oval',
  }),
];

export const SHAPE_MAP: Record<NodeShapeType, ShapeDefinition> = Object.fromEntries(
  SHAPES.map((s) => [s.type, s]),
) as Record<NodeShapeType, ShapeDefinition>;

export function shapesForCategory(category: ShapeCategory): ShapeDefinition[] {
  return SHAPES.filter((s) => s.category === category);
}
