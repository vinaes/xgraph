import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { configToJson, type ExportResult } from './exportConfig';
import {
  generateDeploymentScripts,
  type ServerCredentials,
} from './deploymentScripts';
import {
  generateSubscription,
  generateQrPngBlob,
  type ClientConfigResult,
} from './clientConfigs';
import type { Server } from '@/types';

// ── Full ZIP export ──
// Structure:
//   xray-export-{timestamp}/
//   ├── configs/
//   │   ├── config_server_a.json
//   │   └── client_config.json
//   ├── deployment/
//   │   ├── deploy.sh
//   │   ├── docker-compose.yml
//   │   ├── playbook.yml
//   │   └── inventory.ini
//   └── clients/
//       ├── user1@example.com/
//       │   ├── config.json
//       │   ├── qr.png
//       │   └── link.txt
//       ├── user2@example.com/
//       │   └── ...
//       └── subscription.txt

export async function exportFullZip(
  configs: ExportResult[],
  servers: Server[],
  clientConfigs: ClientConfigResult[],
  projectName: string
): Promise<void> {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const rootDir = `xray-export-${timestamp}`;

  // ── 1. Configs ──
  const configsDir = zip.folder(`${rootDir}/configs`);
  if (configsDir) {
    for (const config of configs) {
      configsDir.file(config.filename, configToJson(config.config));
    }
  }

  // ── 2. Deployment scripts (all types) ──
  if (servers.length > 0 && configs.length > 0) {
    const deployDir = zip.folder(`${rootDir}/deployment`);
    if (deployDir) {
      const credentials: ServerCredentials[] = servers.map((s) => ({
        serverId: s.id,
        sshUser: s.sshUser || 'root',
        authMethod: 'key' as const,
        sshKeyPath: '~/.ssh/id_rsa',
      }));

      // Bash
      const bashScripts = generateDeploymentScripts(servers, configs, credentials, 'bash');
      for (const script of bashScripts) {
        deployDir.file(script.filename, script.content);
      }

      // Docker Compose
      const dcScripts = generateDeploymentScripts(servers, configs, credentials, 'docker-compose');
      for (const script of dcScripts) {
        deployDir.file(script.filename, script.content);
      }

      // Ansible
      const ansibleScripts = generateDeploymentScripts(servers, configs, credentials, 'ansible');
      for (const script of ansibleScripts) {
        deployDir.file(script.filename, script.content);
      }

      // Also include configs in deployment dir for convenience
      for (const config of configs) {
        deployDir.file(config.filename, configToJson(config.config));
      }
    }
  }

  // ── 3. Client configs + QR codes ──
  if (clientConfigs.length > 0) {
    const clientsDir = zip.folder(`${rootDir}/clients`);
    if (clientsDir) {
      // Per-user directories
      const qrPromises: Promise<void>[] = [];

      for (const cc of clientConfigs) {
        const safeEmail = cc.email.replace(/[^a-zA-Z0-9@._-]/g, '_');
        const userDir = clientsDir.folder(safeEmail);
        if (!userDir) continue;

        // Client config JSON
        userDir.file('config.json', JSON.stringify(cc.config, null, 2));

        // Share link
        userDir.file('link.txt', cc.shareLink);

        // QR code (async)
        const qrPromise = generateQrPngBlob(cc.shareLink).then((blob) => {
          userDir.file('qr.png', blob);
        });
        qrPromises.push(qrPromise);
      }

      // Wait for all QR codes to generate
      await Promise.all(qrPromises);

      // Subscription file
      clientsDir.file('subscription.txt', generateSubscription(clientConfigs));
    }
  }

  // ── Generate and download ──
  const blob = await zip.generateAsync({ type: 'blob' });
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'xray-export';
  saveAs(blob, `${safeName}-${timestamp}.zip`);
}
