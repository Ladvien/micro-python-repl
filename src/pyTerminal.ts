'use strict';

import * as vscode from 'vscode';

export function checkIfMicroPyTermExists(terminals: readonly vscode.Terminal[]): boolean {
	return undefined !== selectMicroPythonTerm(terminals);
}

export function sendTextToTerm(text: string) {
	if (ensureTerminalExists()) {
		selectTerminal().then(terminal => {
			if (terminal) {
				terminal.sendText(text);
			}
		});
	}
}

export function ensureTerminalExists(): boolean {
	if ((<any>vscode.window).terminals.length === 0) {
		vscode.window.showErrorMessage('No active terminals');
		return false;
	}
	return true;
}

export function selectTerminal(): Thenable<vscode.Terminal | undefined> {
	interface TerminalQuickPickItem extends vscode.QuickPickItem {
		terminal: vscode.Terminal;
	}
	const terminals = <vscode.Terminal[]>(<any>vscode.window).terminals;
	const items: TerminalQuickPickItem[] = terminals.map(t => {
		return {
			label: `name: ${t.name}`,
			terminal: t
		};
	});
	return vscode.window.showQuickPick(items).then(item => {
		return item ? item.terminal : undefined;
	});
}

export function selectMicroPythonTerm(terminals: readonly vscode.Terminal[]): vscode.Terminal {
	if (undefined === terminals.find(term => term.name === 'MicroPython')) {
		const terminal = vscode.window.createTerminal({
			name: `MicroPython`,
			hideFromUser: false
		} as any);
		return terminal;
	} else {
		return <vscode.Terminal>terminals.find(term => term.name === 'MicroPython');
	}
}