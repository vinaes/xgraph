import DeviceNode from './DeviceNode';
import InboundNode from './InboundNode';
import RoutingNode from './RoutingNode';
import BalancerNode from './BalancerNode';
import OutboundTerminalNode from './OutboundTerminalNode';
import OutboundProxyNode from './OutboundProxyNode';
import SimpleServerNode from './SimpleServerNode';
import SimpleInternetNode from './SimpleInternetNode';
import SimpleBlockNode from './SimpleBlockNode';
import SimpleRulesNode from './SimpleRulesNode';

export const nodeTypes = {
  device: DeviceNode,
  inbound: InboundNode,
  routing: RoutingNode,
  balancer: BalancerNode,
  'outbound-terminal': OutboundTerminalNode,
  'outbound-proxy': OutboundProxyNode,
  'simple-server': SimpleServerNode,
  'simple-internet': SimpleInternetNode,
  'simple-block': SimpleBlockNode,
  'simple-rules': SimpleRulesNode,
};
