import * as vscode from 'vscode';
import { window } from 'vscode';

import { checkIfMicroPyTermExists, sendTextToTerm, ensureTerminalExists,
	     selectTerminal, selectMicroPythonTerm } from './pyTerminal';

import { selectPort, selectBaud } from './serialPort';
import { delay } from './util';

const SerialPort = require('serialport');

export function activate(context: vscode.ExtensionContext) {

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
						terminal.sendText(`rshell -p ${port} -b ${baud}`, true);
						await delay(500);
						terminal.sendText(`connect serial`);
						await delay(1100);
						terminal.sendText('repl');
						terminal.show();
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
