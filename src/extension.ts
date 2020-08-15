import * as vscode from 'vscode';
import { window } from 'vscode';
import { Range } from 'vscode';
import { ensureTerminalExists, selectMicroPythonTerm } from './pyTerminal';

import { REPL } from './repl';
import { PORT_PATH_KEY, BAUD_RATE_KEY } from './serialPort';
import { useDeviceToConnectToRepl } from './serialPort';

// DONE: Wait terminal to warm up before opening REPL.
// DONE: Determine why "\n\n" causes REPL problems.

// TODO: Move useDeviceToConnectToRepl to REPL class.
// TODO: Track indenting +/-.
// TODO: Don't allow use of terminal until VSCode fully initializes.


const SEND_THROTTLE = 100;
let repl: REPL;

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "micro-python-terminal" is now active!');

	let disposable = vscode.commands.registerCommand('micro-python-terminal.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from µ-python-terminal!');
	});

	let sendTextTermCommand = vscode.commands.registerCommand('micro-python-terminal.sendTextTermCommand', async () => {
		const terminal = selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if (undefined !== terminal){
				if (undefined !== window.activeTextEditor?.document) {
					const doc = window.activeTextEditor?.document;
					const { start, end } = window.activeTextEditor.selection;
					const textRange = new Range(start, end);
	
					let chunk = doc.getText(textRange);
					await repl.sendText(terminal, chunk);
				}
			} else {
				window.showErrorMessage('No open document.');
			}
		}).catch((err) => {
			window.showErrorMessage('Unable find or create MicroPython terminal.');
		});
	});


	let microPyTerm = vscode.commands.registerCommand('micro-python-terminal.createTerm', () => {
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if (terminal !== undefined) {
				useDeviceToConnectToRepl(context, terminal).then((newRepl) => {
					repl = newRepl;
				}).catch((err) => {
					vscode.window.showErrorMessage(`Error connecting to MicroPython REPL. ${err}`);
				});
			}
		}).catch((err) => {
			window.showErrorMessage('Unable find or create MicroPython terminal.');
		});
	});

	let selectDevice = vscode.commands.registerCommand('micro-python-terminal.selectDevice', () => {
		
	});


	const subscriptions = [
		disposable,
		microPyTerm,
		sendTextTermCommand,
		selectDevice
	];

	context.subscriptions.push.apply(context.subscriptions, subscriptions);
}

export function deactivate() {
	if (ensureTerminalExists()) {
		vscode.window.terminals.forEach(terminal => {
			if (terminal.name === "MicroPython") {
				repl.quit();
			}
			terminal.dispose();
		});
	}
}
