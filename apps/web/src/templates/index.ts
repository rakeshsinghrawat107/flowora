import type { DiagramType, FloworaEdge, FloworaNode } from '@flowora/shared';

export interface TemplateDefinition {
  id: string;
  name: string;
  type: DiagramType;
  description: string;
  /** Nodes/edges of the template. Ids are template-scoped; the diagram id is fresh. */
  nodes: FloworaNode[];
  edges: FloworaEdge[];
}

const node = (
  id: string,
  type: FloworaNode['type'],
  x: number,
  y: number,
  label: string,
  extra: Partial<FloworaNode> = {},
): FloworaNode => ({
  id,
  type,
  position: { x, y },
  data: { label, ...(extra.data ?? {}) },
  width: extra.width,
  height: extra.height,
  style: extra.style,
});

const edge = (
  id: string,
  source: string,
  target: string,
  label?: string,
  extra: Partial<FloworaEdge> = {},
): FloworaEdge => ({ id, source, target, type: 'bezier', label, arrowHead: true, ...extra });

export const HLD_PAYMENT_TEMPLATE: TemplateDefinition = {
  id: 'tpl-hld-payment',
  name: 'Payment Architecture (HLD)',
  type: 'HLD',
  description: 'Client → CDN → API gateway → payment services → Postgres & Redis.',
  nodes: [
    node('n-client', 'user', 40, 180, 'Customer', { width: 120, height: 110 }),
    node('n-cdn', 'external', 240, 190, 'CDN', { width: 150, height: 60 }),
    node('n-gateway', 'api', 470, 190, 'API Gateway', { width: 180, height: 60 }),
    node('n-auth', 'service', 730, 80, 'Auth Service', { width: 180, height: 60 }),
    node('n-payment', 'service', 730, 200, 'Payment Service', { width: 180, height: 60 }),
    node('n-order', 'service', 730, 320, 'Order Service', { width: 180, height: 60 }),
    node('n-pg', 'database', 990, 140, 'Postgres', { width: 170, height: 70 }),
    node('n-redis', 'queue', 990, 280, 'Redis (Cache)', { width: 170, height: 60 }),
  ],
  edges: [
    edge('e-1', 'n-client', 'n-cdn', 'HTTPS'),
    edge('e-2', 'n-cdn', 'n-gateway', 'REST /api'),
    edge('e-3', 'n-gateway', 'n-auth', 'validates'),
    edge('e-4', 'n-gateway', 'n-payment', 'charges'),
    edge('e-5', 'n-gateway', 'n-order', 'places orders'),
    edge('e-6', 'n-payment', 'n-pg', 'stores'),
    edge('e-7', 'n-order', 'n-pg', 'stores'),
    edge('e-8', 'n-order', 'n-redis', 'caches'),
  ],
};

export const LLD_ORDER_TEMPLATE: TemplateDefinition = {
  id: 'tpl-lld-order',
  name: 'Order Service Classes (LLD)',
  type: 'LLD',
  description: 'Controller → Service → Repository → Database, with class members.',
  nodes: [
    node('n-controller', 'class', 40, 120, 'OrderController', {
      width: 230,
      height: 170,
      data: {
        label: 'OrderController',
        attributes: ['- orderService: OrderService'],
        methods: ['+ createOrder(req)', '+ getOrder(id)'],
      },
    }),
    node('n-service', 'class', 350, 120, 'OrderService', {
      width: 230,
      height: 170,
      data: {
        label: 'OrderService',
        attributes: ['- repo: OrderRepository'],
        methods: ['+ placeOrder(order)', '+ cancelOrder(id)'],
      },
    }),
    node('n-repo', 'class', 660, 120, 'OrderRepository', {
      width: 230,
      height: 170,
      data: {
        label: 'OrderRepository',
        attributes: ['- db: DataSource'],
        methods: ['+ save(order)', '+ findById(id)'],
      },
    }),
    node('n-entity', 'class', 350, 360, 'Order', {
      width: 230,
      height: 150,
      data: {
        label: 'Order',
        attributes: ['- id: uuid', '- total: money', '- status: enum'],
        methods: ['+ addItem(item)'],
      },
    }),
    node('n-db', 'database', 660, 380, 'Postgres', { width: 170, height: 70 }),
  ],
  edges: [
    edge('e-1', 'n-controller', 'n-service', 'calls'),
    edge('e-2', 'n-service', 'n-repo', 'uses'),
    edge('e-3', 'n-repo', 'n-db', 'persists'),
    edge('e-4', 'n-service', 'n-entity', 'creates'),
  ],
};

export const ERD_UNIVERSITY_TEMPLATE: TemplateDefinition = {
  id: 'tpl-erd-university',
  name: 'University Enrollment (ERD)',
  type: 'ERD',
  description: 'Student / Course entities with an ENROLLS relationship and PK/FK attributes.',
  nodes: [
    node('n-student', 'entity', 40, 120, 'Student', {
      width: 210,
      height: 130,
      data: {
        label: 'Student',
        attributes: ['student_id: int PK', 'name: string', 'email: string'],
      },
    }),
    node('n-enrolls', 'relationship', 330, 150, 'ENROLLS', { width: 170, height: 90 }),
    node('n-course', 'entity', 580, 120, 'Course', {
      width: 210,
      height: 130,
      data: {
        label: 'Course',
        attributes: ['course_id: int PK', 'title: string', 'credits: int'],
      },
    }),
    node('n-grade', 'attribute', 330, 320, 'grade: string', { width: 150, height: 56 }),
    node('n-enrollment', 'entity', 330, 430, 'Enrollment', {
      width: 210,
      height: 110,
      data: {
        label: 'Enrollment',
        attributes: ['student_id: int FK', 'course_id: int FK'],
      },
    }),
  ],
  edges: [
    edge('e-1', 'n-student', 'n-enrolls', '1'),
    edge('e-2', 'n-enrolls', 'n-course', 'N'),
    edge('e-3', 'n-enrolls', 'n-grade', ''),
    edge('e-4', 'n-enrollment', 'n-student', 'N:1'),
    edge('e-5', 'n-enrollment', 'n-course', 'N:1'),
  ],
};

export const FLOWCHART_LOGIN_TEMPLATE: TemplateDefinition = {
  id: 'tpl-flowchart-login',
  name: 'Login Flow (Flowchart)',
  type: 'flowchart',
  description: 'Start → enter credentials → validate → dashboard or error.',
  nodes: [
    node('n-start', 'terminator', 280, 20, 'Start', { width: 160, height: 56 }),
    node('n-input', 'io', 260, 120, 'Enter email & password', { width: 200, height: 60 }),
    node('n-validate', 'process', 260, 220, 'Validate credentials', { width: 200, height: 60 }),
    node('n-decision', 'decision', 265, 330, 'Valid?', { width: 190, height: 110 }),
    node('n-ok', 'process', 540, 350, 'Show dashboard', { width: 180, height: 60 }),
    node('n-fail', 'process', 20, 350, 'Show error message', { width: 190, height: 60 }),
    node('n-end', 'terminator', 540, 480, 'End', { width: 160, height: 56 }),
  ],
  edges: [
    edge('e-1', 'n-start', 'n-input'),
    edge('e-2', 'n-input', 'n-validate'),
    edge('e-3', 'n-validate', 'n-decision'),
    edge('e-4', 'n-decision', 'n-ok', 'Yes'),
    edge('e-5', 'n-decision', 'n-fail', 'No'),
    edge('e-6', 'n-ok', 'n-end'),
    edge('e-7', 'n-fail', 'n-input', 'Retry'),
  ],
};

export const TEMPLATES: TemplateDefinition[] = [
  HLD_PAYMENT_TEMPLATE,
  LLD_ORDER_TEMPLATE,
  ERD_UNIVERSITY_TEMPLATE,
  FLOWCHART_LOGIN_TEMPLATE,
];
