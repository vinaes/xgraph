import DeviceNode from './DeviceNode';
import InboundNode from './InboundNode';
import RoutingNode from './RoutingNode';
import BalancerNode from './BalancerNode';
import OutboundTerminalNode from './OutboundTerminalNode';
import OutboundProxyNode from './OutboundProxyNode';

export const nodeTypes = {
  device: DeviceNode,
  inbound: InboundNode,
  routing: RoutingNode,
  balancer: BalancerNode,
  'outbound-terminal': OutboundTerminalNode,
  'outbound-proxy': OutboundProxyNode,
};
