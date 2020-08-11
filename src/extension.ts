import * as vscode from 'vscode';
import { window } from 'vscode';

import { checkIfMicroPyTermExists, sendTextToTerm, ensureTerminalExists,
	     selectTerminal, selectMicroPythonTerm } from './pyTerminal';
import { selectPort, selectBaud } from './serialPort';
import { delay } from './util';
import { REPL } from './repl';

const SerialPort = require('serialport');

export function activate(context: vscode.ExtensionContext) {

	let repl: REPL;

	console.log('Congratulations, your extension "micro-python-terminal" is now active!');

	let disposable = vscode.commands.registerCommand('micro-python-terminal.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from µ-python-terminal!');
	});

	let microPyTerm = vscode.commands.registerCommand('micro-python-terminal.createTerm', () => {
		if (ensureTerminalExists()) {
			const terminal = selectMicroPythonTerm(vscode.window.terminals);
			if (terminal !== undefined) {
				selectPort(SerialPort).then((port) => {
					selectBaud().then(async (baud) => {
						repl = new REPL(terminal, port, baud);
					}).catch((err) => {
						console.log(err);
					});
				}).catch((err) => {
					console.log(err);
				});
			}
		}
	});

	context.subscriptions.push(microPyTerm);
	context.subscriptions.push(disposable);
}

export function deactivate() {
	if (ensureTerminalExists()) {
		selectTerminal().then(terminal => {
			if (terminal) {
				terminal.dispose();
			}
		});
	}
}
