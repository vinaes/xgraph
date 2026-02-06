import type { Node } from '@xyflow/react';
import type { XrayNodeData } from '@/types';

type GraphNode = Node<XrayNodeData>;

/**
 * Connection validation rules per the xray graph spec:
 *
 * Allowed:
 *   Input → Routing
 *   Input → Output (direct, bypasses routing)
 *   Routing → Routing (fallback/chaining)
 *   Routing → Balancer
 *   Routing → Output
 *   Balancer → Output (multiple)
 *   Output Proxy → Input (cross-server chain, infrastructure mode)
 *   Device → Output (client side)
 *
 * Forbidden:
 *   Terminal OUTPUT → anything (freedom/blackhole/dns have no outgoing)
 *   Anything → INPUT (except outbound-proxy → inbound for proxy chains)
 *   Cycles (except reverse proxy cases — not enforced here)
 */
export function isValidConnection(
  sourceNode: GraphNode,
  targetNode: GraphNode
): { valid: boolean; reason?: string } {
  const sourceType = (sourceNode.data as XrayNodeData).nodeType;
  const targetType = (targetNode.data as XrayNodeData).nodeType;

  // Terminal outbounds can never be a source
  if (sourceType === 'outbound-terminal') {
    return {
      valid: false,
      reason: 'Terminal OUTPUT nodes (freedom/blackhole/dns) cannot have outgoing connections',
    };
  }

  // Define allowed connections
  const allowed: Record<string, string[]> = {
    device: ['inbound', 'outbound-proxy'], // device connects to INPUT (socks/http) or OUTPUT on client side
    inbound: ['routing', 'balancer', 'outbound-terminal', 'outbound-proxy'],
    routing: ['routing', 'balancer', 'outbound-terminal', 'outbound-proxy'],
    balancer: ['outbound-terminal', 'outbound-proxy'],
    'outbound-proxy': ['inbound'], // proxy chain: OUTPUT on server A → INPUT on server B
  };

  const allowedTargets = allowed[sourceType];
  if (!allowedTargets || !allowedTargets.includes(targetType)) {
    return {
      valid: false,
      reason: `Cannot connect ${sourceType} to ${targetType}`,
    };
  }

  return { valid: true };
}

/**
 * Lookup helper: find a node by its React Flow ID.
 */
export function findNodeById(nodes: GraphNode[], id: string): GraphNode | undefined {
  return nodes.find((n) => n.id === id);
}
