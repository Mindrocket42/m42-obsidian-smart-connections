# Building Smart Connections from Source

This guide explains how to build the Smart Connections plugin from source with extended embedding model providers (Ollama, LM Studio, OpenRouter, Azure OpenAI).

## Prerequisites

- Node.js v18+ 
- npm v9+
- Git

## Repository Structure

The project uses npm workspaces with sibling repositories:

```
projects/ext/
├── obsidian-smart-connections/   # Main plugin
├── jsbrains/                     # Core smart-* packages
├── obsidian-smart-env/           # Obsidian environment wrapper
└── smart-context-obsidian/       # Context plugin
```

## Initial Setup (One-time)

### 1. Clone Required Repositories

```bash
cd /path/to/your/projects
mkdir -p ext && cd ext

# Clone all required repos
git clone https://github.com/brianpetro/obsidian-smart-connections.git
git clone https://github.com/brianpetro/jsbrains.git
git clone https://github.com/brianpetro/obsidian-smart-env.git
git clone https://github.com/brianpetro/smart-context-obsidian.git
```

### 2. Install Dependencies

```bash
# Install jsbrains dependencies
cd jsbrains && npm install && cd ..

# Install obsidian-smart-env dependencies
cd obsidian-smart-env && npm install && cd ..

# Install main plugin dependencies
cd obsidian-smart-connections && npm install
```

### 3. Create Environment File

```bash
cd obsidian-smart-connections
echo 'DEFAULT_OPEN_ROUTER_API_KEY=""' > .env
```

## Building

### Standard Build

```bash
cd obsidian-smart-connections
npm run build
```

Output files are created in `dist/`:
- `main.js` - Bundled plugin (~1.1MB)
- `manifest.json` - Plugin manifest
- `styles.css` - Plugin styles

### Auto-copy to Vaults

Add vault paths to `.env` for automatic deployment:

```bash
# .env
DEFAULT_OPEN_ROUTER_API_KEY=""
DESTINATION_VAULTS=../../my-vault,../../another-vault
```

Now `npm run build` will copy files to each vault automatically.

## Installing in Obsidian

### Option A: Manual Copy

```bash
VAULT="/path/to/your/vault"
mkdir -p "$VAULT/.obsidian/plugins/smart-connections"
cp dist/* "$VAULT/.obsidian/plugins/smart-connections/"
```

### Option B: Symlink (Development)

```bash
VAULT="/path/to/your/vault"
ln -s "$(pwd)/dist" "$VAULT/.obsidian/plugins/smart-connections"
```

### Option C: Use DESTINATION_VAULTS

Configure `.env` as shown above, then each build auto-deploys.

## Enabling in Obsidian

1. Open Obsidian Settings
2. Go to Community Plugins
3. Disable "Restricted Mode" if prompted
4. Find "Smart Connections" in Installed Plugins
5. Enable it

## Hot Reload (Development)

1. Install "Hot-Reload" plugin from Obsidian Community Plugins
2. The build script creates `.hotreload` file automatically
3. Each rebuild triggers automatic plugin reload

## Rebuilding After Changes

```bash
cd obsidian-smart-connections
npm run build
```

If using DESTINATION_VAULTS + Hot-Reload, changes appear in Obsidian immediately.

## Troubleshooting

### Missing Dependencies

If build fails with "Cannot find package X":

```bash
# Reinstall all dependencies
cd jsbrains && npm install && cd ..
cd obsidian-smart-env && npm install && cd ..
cd obsidian-smart-connections && rm -rf node_modules && npm install
```

### smart-plugins-obsidian Error

This is a private Pro repository. It's marked as external in the build and won't affect core functionality.

## Extended Providers

This fork includes additional embedding model providers:

| Provider | Type | Requirements |
|----------|------|--------------|
| Transformers | Local | Built-in, no setup |
| Ollama | Local | Ollama app running |
| LM Studio | Local | LM Studio with server enabled |
| OpenRouter | Cloud | API key from openrouter.ai |
| Azure OpenAI | Cloud | Azure OpenAI resource + deployment |
