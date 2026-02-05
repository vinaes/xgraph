# Xray Graph Builder

A visual graph-based editor for building and managing [Xray-core](https://github.com/XTLS/Xray-core) proxy infrastructure.

## Overview

Xray Graph Builder is a browser-based tool that lets you design complex proxy networks through an intuitive visual interface. Build everything from simple VPNs to multi-server infrastructures without editing JSON configs manually.

**Key Features:**
- 🎨 Visual graph editor - drag, drop, and connect nodes
- 🚀 Zero backend - runs entirely in your browser
- 📦 Export ready-to-deploy configs and deployment scripts
- 🐳 Docker-based deployment (using official `teddysun/xray` image)
- 🔄 Import existing xray configs
- 📱 Generate client configs with QR codes
- 🎯 Traffic simulation - see where your traffic flows
- 📚 Built-in templates for common scenarios

## Supported Features

**Protocols:**
- VLESS, VMess, Trojan, Shadowsocks
- HTTP, SOCKS, Dokodemo-door

**Transports:**
- TCP, WebSocket, gRPC, XHTTP
- TLS and Reality security


## Quick Start

Open xgraph.vinaes.co or build it locally we dont mind.


## Use Cases

- **Personal VPN** - Simple client → proxy → internet setup
- **Geo-routing** - Route traffic based on country (RU → direct, others → proxy)
- **Multi-hop chains** - Entry → Relay → Exit server chains
- **Load balancing** - Distribute traffic across multiple servers
- **CDN-ready** - WebSocket + TLS configs for Cloudflare

## Export Options

- **JSON configs** - Standard xray config.json files
- **Deployment scripts** - Bash, Docker Compose, or Ansible
- **Client configs** - QR codes and subscription links for mobile clients

## Browser Requirements

- Chrome/Edge 100+
- Firefox 100+
- Safari 15+

## Security & Privacy

- **No data collection** - everything stays in your browser
- **No backend** - no servers, no databases, no telemetry
- **LocalStorage only** - auto-save to your browser's local storage
- **Client-side only** - built with React 18.3.x

## Development

Built with:
- React 18.3.x + TypeScript
- React Flow (graph visualization)
- Vite (build tool)
- Tailwind CSS (styling)

## Disclaimer

This software was created by VINAES.CO ⨯ RALPH ⨯ CLAUDE CODE.
Since it was purely written by AI - the software is provided AS IS.

## License

MIT License. Do whatever you want with it.

## Contributing

Contributions welcome! Please open an issue first to discuss proposed changes.

## Roadmap

**v1.0** - Visual graph builder, templates, export/import, simulation mode  
**v2.0** - AI-powered graph generation (describe your setup in natural language)

## Sponsorship

This software is completely free for use but you can spare some USDTs if you want!

TRC20: `TVporaq1mYBnBiUyFzCcCB8BHwdMzbUwLg`

TON: `UQDWMZfSZ3Xcj2SsPXp9d4dkjJ1jyHq_kb_2ymuYCCFYp7g6`

## Links

- [Xray-core Documentation](https://xtls.github.io/en/)
