import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store';
import { exportConfig, configToJson, type ExportResult } from '@/utils/exportConfig';
import {
  generateDeploymentScripts,
  type ScriptType,
  type ServerCredentials,
  type DeploymentResult,
} from '@/utils/deploymentScripts';
import {
  generateClientConfigs,
  generateSubscription,
  generateQrDataUrl,
  type ClientConfigResult,
} from '@/utils/clientConfigs';
import { exportFullZip } from '@/utils/zipExport';
import { useToastStore } from '@/components/ToastContainer';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

type ExportTab = 'configs' | 'deployment' | 'clients';

function downloadFile(filename: string, content: string, mime = 'application/octet-stream') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Configs Tab ──

function ConfigsTab({ results }: { results: ExportResult[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedResult = results[selectedIndex];
  const [copied, setCopied] = useState(false);

  if (results.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        No nodes to export. Add some nodes to the canvas first.
      </div>
    );
  }

  const handleCopy = async () => {
    if (!selectedResult) return;
    await navigator.clipboard.writeText(configToJson(selectedResult.config));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    useToastStore.getState().addToast({ level: 'success', message: 'Config copied to clipboard' });
  };

  const handleDownload = () => {
    if (!selectedResult) return;
    downloadFile(selectedResult.filename, configToJson(selectedResult.config), 'application/json');
    useToastStore.getState().addToast({ level: 'success', message: `Downloaded ${selectedResult.filename}` });
  };

  const handleDownloadAll = () => {
    for (const r of results) {
      downloadFile(r.filename, configToJson(r.config), 'application/json');
    }
    useToastStore.getState().addToast({ level: 'success', message: `Downloaded ${results.length} config(s)` });
  };

  const inboundCount = selectedResult ? selectedResult.config.inbounds.length : 0;
  const outboundCount = selectedResult ? selectedResult.config.outbounds.length : 0;
  const ruleCount = selectedResult ? selectedResult.config.routing.rules.length : 0;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* File tabs */}
      {results.length > 1 && (
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {results.map((r, i) => (
            <button
              key={r.filename}
              onClick={() => setSelectedIndex(i)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                i === selectedIndex
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {r.filename}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      {selectedResult && (
        <div className="flex gap-4 text-xs">
          <span className="text-green-400">{inboundCount} inbound{inboundCount !== 1 ? 's' : ''}</span>
          <span className="text-red-400">{outboundCount} outbound{outboundCount !== 1 ? 's' : ''}</span>
          <span className="text-blue-400">{ruleCount} rule{ruleCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* JSON Preview */}
      {selectedResult && (
        <div className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded-lg min-h-0">
          <pre className="p-4 text-xs text-slate-300 font-mono leading-relaxed">
            {configToJson(selectedResult.config)}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button onClick={handleCopy} className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <button
          onClick={results.length === 1 ? handleDownload : handleDownloadAll}
          className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          Download{results.length > 1 ? ' All' : ''}
        </button>
      </div>
    </div>
  );
}

// ── Deployment Tab ──

function DeploymentTab({ results }: { results: ExportResult[] }) {
  const servers = useStore((s) => s.servers);
  const [scriptType, setScriptType] = useState<ScriptType>('bash');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  // Editable credentials state — transient, never saved in project
  const [credentials, setCredentials] = useState<ServerCredentials[]>(() =>
    servers.map((s) => ({
      serverId: s.id,
      sshUser: s.sshUser || 'root',
      authMethod: 'key' as const,
      sshKeyPath: '~/.ssh/id_rsa',
    }))
  );

  // Sync credentials when servers change (add new ones, keep existing edits)
  useEffect(() => {
    setCredentials((prev) => {
      const existing = new Map(prev.map((c) => [c.serverId, c]));
      return servers.map((s) =>
        existing.get(s.id) || {
          serverId: s.id,
          sshUser: s.sshUser || 'root',
          authMethod: 'key' as const,
          sshKeyPath: '~/.ssh/id_rsa',
        }
      );
    });
  }, [servers]);

  const updateCredential = (serverId: string, updates: Partial<ServerCredentials>) => {
    setCredentials((prev) =>
      prev.map((c) => (c.serverId === serverId ? { ...c, ...updates } : c))
    );
  };

  const deploymentResults: DeploymentResult[] = useMemo(() => {
    if (servers.length === 0 || results.length === 0) return [];
    return generateDeploymentScripts(servers, results, credentials, scriptType);
  }, [servers, results, credentials, scriptType]);

  const selectedFile = deploymentResults[selectedFileIndex];

  if (servers.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        <p>No servers configured.</p>
        <p className="text-xs mt-1 text-slate-500">Add servers in the Palette panel to generate deployment scripts.</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        No configs to deploy. Add nodes to the canvas first.
      </div>
    );
  }

  const handleCopy = async () => {
    if (!selectedFile) return;
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    useToastStore.getState().addToast({ level: 'success', message: 'Script copied to clipboard' });
  };

  const handleDownload = () => {
    if (!selectedFile) return;
    downloadFile(selectedFile.filename, selectedFile.content);
    useToastStore.getState().addToast({ level: 'success', message: `Downloaded ${selectedFile.filename}` });
  };

  const handleDownloadAll = () => {
    for (const r of deploymentResults) {
      downloadFile(r.filename, r.content);
    }
    useToastStore.getState().addToast({ level: 'success', message: `Downloaded ${deploymentResults.length} script(s)` });
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Script type selector */}
      <div>
        <div className="text-xs text-slate-400 mb-1.5">Script Type</div>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {([
            { id: 'bash', label: 'Bash Script' },
            { id: 'docker-compose', label: 'Docker Compose' },
            { id: 'ansible', label: 'Ansible' },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              onClick={() => { setScriptType(opt.id); setSelectedFileIndex(0); }}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                scriptType === opt.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="text-[11px] text-slate-500 bg-slate-800/50 rounded px-3 py-2">
        {scriptType === 'bash' && (
          <>Bash script that SSHs into each server, installs Docker if needed, and deploys xray using the teddysun/xray image.</>
        )}
        {scriptType === 'docker-compose' && (
          <>Docker Compose file for each server. Copy to your server alongside the config.json and run <code className="text-slate-400">docker compose up -d</code>.</>
        )}
        {scriptType === 'ansible' && (
          <>Ansible playbook + inventory for automated deployment across all servers. Run with <code className="text-slate-400">ansible-playbook -i inventory.ini playbook.yml</code>.</>
        )}
      </div>

      {/* Server Credentials (collapsible) */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowCredentials(!showCredentials)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors text-xs"
        >
          <span className="text-slate-300 font-medium">Server Credentials</span>
          <span className="text-slate-500 text-[10px]">
            {showCredentials ? '▲ Hide' : '▼ Configure'}
          </span>
        </button>
        {showCredentials && (
          <div className="px-3 py-2 space-y-3">
            <div className="text-[10px] text-amber-400/80 flex items-start gap-1.5">
              <span className="mt-0.5">⚠</span>
              <span>Used for deployment only. Not saved in project files.</span>
            </div>
            {servers.map((server) => {
              const cred = credentials.find((c) => c.serverId === server.id);
              if (!cred) return null;
              return (
                <div key={server.id} className="bg-slate-900/50 rounded-lg p-2.5 space-y-2">
                  <div className="text-[11px] text-slate-300 font-medium">
                    {server.name} <span className="text-slate-500 font-normal">({server.host})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">SSH User</label>
                      <input
                        type="text"
                        value={cred.sshUser}
                        onChange={(e) => updateCredential(server.id, { sshUser: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Auth Method</label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateCredential(server.id, { authMethod: 'key' })}
                          className={`flex-1 px-2 py-1 text-[11px] rounded transition-colors ${
                            cred.authMethod === 'key'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          SSH Key
                        </button>
                        <button
                          onClick={() => updateCredential(server.id, { authMethod: 'password' })}
                          className={`flex-1 px-2 py-1 text-[11px] rounded transition-colors ${
                            cred.authMethod === 'password'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          Password
                        </button>
                      </div>
                    </div>
                  </div>
                  {cred.authMethod === 'key' && (
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">SSH Key Path</label>
                      <input
                        type="text"
                        value={cred.sshKeyPath || ''}
                        onChange={(e) => updateCredential(server.id, { sshKeyPath: e.target.value })}
                        placeholder="~/.ssh/id_rsa"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File tabs (if multiple files) */}
      {deploymentResults.length > 1 && (
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {deploymentResults.map((r, i) => (
            <button
              key={r.filename}
              onClick={() => setSelectedFileIndex(i)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                i === selectedFileIndex
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {r.filename}
            </button>
          ))}
        </div>
      )}

      {/* Preview */}
      {selectedFile && (
        <div className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded-lg min-h-0">
          <pre className="p-4 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre">
            {selectedFile.content}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button onClick={handleCopy} className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={deploymentResults.length === 1 ? handleDownload : handleDownloadAll}
          className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          Download{deploymentResults.length > 1 ? ' All' : ''}
        </button>
      </div>
    </div>
  );
}

// ── Client Configs Tab ──

function ClientConfigsTab() {
  const nodes = useStore((s) => s.nodes);
  const servers = useStore((s) => s.servers);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Use the first server's address as default, or fallback
  const serverAddress = servers.length > 0 ? servers[0]!.host : undefined;

  const clientConfigs: ClientConfigResult[] = useMemo(() =>
    generateClientConfigs(nodes, serverAddress),
    [nodes, serverAddress]
  );

  const selectedConfig = clientConfigs[selectedIndex];

  // Generate QR code when selected config changes
  useEffect(() => {
    setQrDataUrl(null);
    if (!selectedConfig) return;
    let cancelled = false;
    generateQrDataUrl(selectedConfig.shareLink).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [selectedConfig]);

  if (clientConfigs.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        <p>No client configs available.</p>
        <p className="text-xs mt-1 text-slate-500">
          Add users to VLESS, VMess, or Trojan inbound nodes to generate client configs.
        </p>
      </div>
    );
  }

  const handleCopyLink = async () => {
    if (!selectedConfig) return;
    await navigator.clipboard.writeText(selectedConfig.shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    useToastStore.getState().addToast({ level: 'success', message: 'Share link copied' });
  };

  const handleDownloadConfig = () => {
    if (!selectedConfig) return;
    const json = JSON.stringify(selectedConfig.config, null, 2);
    downloadFile(`${selectedConfig.email}_config.json`, json, 'application/json');
    useToastStore.getState().addToast({ level: 'success', message: `Downloaded ${selectedConfig.email} config` });
  };

  const handleDownloadSubscription = () => {
    const sub = generateSubscription(clientConfigs);
    downloadFile('subscription.txt', sub, 'text/plain');
    useToastStore.getState().addToast({ level: 'success', message: 'Downloaded subscription file' });
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* User list */}
      <div>
        <div className="text-xs text-slate-400 mb-1.5">
          {clientConfigs.length} user{clientConfigs.length !== 1 ? 's' : ''} found
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {clientConfigs.map((cc, i) => (
            <button
              key={`${cc.email}-${i}`}
              onClick={() => setSelectedIndex(i)}
              className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors flex items-center justify-between ${
                i === selectedIndex
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-600/50'
                  : 'text-slate-400 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <span>{cc.email}</span>
              <span className="text-[10px] text-slate-500 uppercase">{cc.protocol}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected user details */}
      {selectedConfig && (
        <>
          {/* Share link + QR code */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400 mb-1">Share Link</div>
              <div className="bg-slate-950 border border-slate-800 rounded p-2 text-[11px] text-slate-300 font-mono break-all select-all">
                {selectedConfig.shareLink}
              </div>
            </div>
            {/* QR Code */}
            <div className="flex-shrink-0">
              <div className="text-xs text-slate-400 mb-1">QR Code</div>
              <div className="w-[100px] h-[100px] bg-white rounded flex items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-full h-full rounded" />
                ) : (
                  <div className="text-xs text-slate-400">Loading...</div>
                )}
              </div>
            </div>
          </div>

          {/* Config preview */}
          <div className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded-lg min-h-0">
            <pre className="p-3 text-[11px] text-slate-300 font-mono leading-relaxed">
              {JSON.stringify(selectedConfig.config, null, 2)}
            </pre>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end flex-wrap">
        <button onClick={handleCopyLink} className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button onClick={handleDownloadSubscription} className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
          Subscription
        </button>
        <button onClick={handleDownloadConfig} className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
          Download Config
        </button>
      </div>
    </div>
  );
}

// ── Main Dialog ──

export default function ExportDialog({ open, onClose }: ExportDialogProps) {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const servers = useStore((s) => s.servers);
  const projectName = useStore((s) => s.name);
  const [tab, setTab] = useState<ExportTab>('configs');
  const [zipping, setZipping] = useState(false);

  const results: ExportResult[] = useMemo(() => {
    if (!open) return [];
    try {
      return exportConfig(nodes, edges, servers);
    } catch (err) {
      console.error('Export config generation failed:', err);
      useToastStore.getState().addToast({
        level: 'error',
        message: `Config generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return [];
    }
  }, [open, nodes, edges, servers]);

  const serverAddress = servers.length > 0 ? servers[0]!.host : undefined;
  const clientConfigs = useMemo(() => {
    try {
      return generateClientConfigs(nodes, serverAddress);
    } catch (err) {
      console.error('Client config generation failed:', err);
      return [];
    }
  }, [nodes, serverAddress]);

  const handleDownloadZip = async () => {
    if (results.length === 0) return;
    setZipping(true);
    try {
      await exportFullZip(results, servers, clientConfigs, projectName);
      useToastStore.getState().addToast({ level: 'success', message: 'ZIP package downloaded' });
    } catch (err) {
      useToastStore.getState().addToast({ level: 'error', message: `ZIP export failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setZipping(false);
    }
  };

  if (!open) return null;

  const tabs: { id: ExportTab; label: string }[] = [
    { id: 'configs', label: 'Configs' },
    { id: 'deployment', label: 'Deployment' },
    { id: 'clients', label: 'Client Configs' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Export</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-700 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 min-h-0">
          {tab === 'configs' && <ConfigsTab results={results} />}
          {tab === 'deployment' && <DeploymentTab results={results} />}
          {tab === 'clients' && <ClientConfigsTab />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            {results.length > 0
              ? `${results.length} config${results.length > 1 ? 's' : ''} ready`
              : 'No configs'}
          </div>
          <div className="flex gap-2">
            {results.length > 0 && (
              <button
                onClick={handleDownloadZip}
                disabled={zipping}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:text-green-400 rounded-lg transition-colors"
              >
                {zipping ? 'Packaging...' : 'Download ZIP'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
