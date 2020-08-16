'use strict';

import * as vscode from 'vscode';
import { delay } from './util';

export function checkIfMicroPyTermExists(terminals: readonly vscode.Terminal[]): boolean {
	return undefined !== selectMicroPythonTerm(terminals);
}

export function ensureTerminalExists(): boolean {
	if ((<any>vscode.window).terminals.length === 0) {
		vscode.window.showErrorMessage('No active terminals');
		return false;
	}
	return true;
}

export function selectMicroPythonTerm(terminals: readonly vscode.Terminal[]): Promise<vscode.Terminal> {
    return new Promise(async (resolve) => {
        if (undefined === terminals.find(term => term.name === 'MicroPython')) {
            const terminal = vscode.window.createTerminal({
                name: `MicroPython`,
                hideFromUser: true
            } as any);
            await delay(1000);
            resolve(terminal);
        } else {
            resolve(<vscode.Terminal>terminals.find(term => term.name === 'MicroPython'));
        }
    });
}