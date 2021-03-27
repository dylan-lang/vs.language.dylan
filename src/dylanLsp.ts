/* --------------------------------------------------------------------------------------------
 * Based on LSP example code which is
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import {existsSync} from 'fs';
import  * as vscode from 'vscode';
import {get_channel, get_compiler} from './extension';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	ExecutableOptions
} from 'vscode-languageclient/node';

let client: LanguageClient;
// TODO - this should be a setting
let registries : string|undefined = undefined
function user_registries() {
	if (!registries) {
		registries = process.env["OPEN_DYLAN_USER_REGISTRIES"] || "."
	}
	return registries;
}
/**
 * Find the Dylan LSP executable.
 * Look on the PATH for `lsp-dylan`. 
 * Can be overridden with `dylan.lsp` in the Settings.
 * Returns undefined if nothing found.
 */
 function find_language_server(): string | undefined {
    const config = vscode.workspace.getConfiguration('dylan')
    const dylan_compiler = config.get<string>('lsp');

    if (dylan_compiler) {
		if (existsSync(dylan_compiler)){
		get_channel().appendLine("LSP given explicitly "+dylan_compiler);
        return dylan_compiler;
		} else {
			get_channel().appendLine("LSP given explicitly "+dylan_compiler+" but not found");
			return undefined;
		}
    } else {
        /* No setting, assume it's on the path */
        const paths = (process.env.PATH || "").split(path.delimiter)
        const exe = process.platform == "win32" ? "lsp-dylan.exe" : "lsp-dylan";
        for (const p of paths) {
            const dc = path.join(p, exe);
            if (existsSync(dc)) {
				get_channel().appendLine("LSP found on path "+dc);
                return dc;
            }
        }
		get_channel().appendLine("LSP not in "+paths+" or given explicitly");
        return undefined; // Not found anywhere
    }

}
export function activateLsp(context: vscode.ExtensionContext): void {
	// The server is implemented in dylan native code
	// TODO find the server from config, or from being on the path
	const serverExe = find_language_server();
	if (serverExe) {
		get_channel().appendLine(`serverExe: ${serverExe}`)
		get_channel().appendLine(`compiler: ${get_compiler()}`)
	const openDylanRelease =
		path.join(path.dirname(get_compiler()), '..');
	const runOptions: ExecutableOptions = {
		env: {
			...process.env, 
			OPEN_DYLAN_RELEASE: openDylanRelease,
			OPEN_DYLAN_USER_REGISTRIES: user_registries()
		}
	}
	const serverOptions: ServerOptions = {
		run: {
			command: serverExe,
			options: runOptions
		},
		debug: {
			command: serverExe, args: ['--debug-server'],
			options: runOptions
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for dylan source documents
		documentSelector: [{ scheme: 'file', language: 'dylan' }],
		synchronize: { configurationSection: 'dylan' }
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'dylan',
		'Dylan Language Server',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	const disposable = client.start();
	context.subscriptions.push(disposable);
	} else {
		// Server not found.
		vscode.window.showErrorMessage("Dylan language server not found. Advanced editing functions will not be available.")

	}
}

export function deactivateLsp(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
