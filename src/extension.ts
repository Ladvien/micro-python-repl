import * as vscode from 'vscode';
import { window } from 'vscode';
import { Range } from 'vscode';
import { ensureTerminalExists, selectMicroPythonTerm } from './pyTerminal';

import { REPL } from './repl';
// import { connectToRepl } from './serialConnection';
import { SerialConnection } from "./serialConnection";
import { SerialDevice } from './SerialDevice';
import { PORT_PATH_KEY, BAUD_RATE_KEY } from "./serialConnection";
import { delay } from './util';

// DONE: Wait terminal to warm up before opening REPL.
// DONE: Determine why "\n\n" causes REPL problems.

// TODO: Move useDeviceToConnectToRepl to REPL class.
// TODO: Track indenting +/-.
// TODO: Don't allow use of terminal until VSCode fully initializes.


const SEND_THROTTLE = 100;

let repl: REPL;
let serialDevice: SerialDevice;
let serialConnection: SerialConnection;

export function activate(context: vscode.ExtensionContext) {

	serialDevice = new SerialDevice(<string>context.workspaceState.get(PORT_PATH_KEY), <string>context.workspaceState.get(BAUD_RATE_KEY));
	serialConnection = new SerialConnection(serialDevice);

	console.log('Congratulations, your extension "micro-python-terminal" is now active!');
	
	let microPyTerm = vscode.commands.registerCommand('micro-python-terminal.createTerm', () => {
		connectTerminalToREPL().then((result) => {
			console.log(result);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to create a MicroPython terminal. ${err}`);
		});
	});

	let sendTextTermCommand = vscode.commands.registerCommand('micro-python-terminal.sendTextTermCommand', async () => {
		if (repl === undefined || !repl.isConnected()){
			vscode.window.showErrorMessage('MicroPython or RShell not available.  Please run "Select device and create MicroPython Terminal" first.');
			return;
		}
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
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

	let selectDeviceCommand = vscode.commands.registerCommand('micro-python-terminal.selectDevice', async () => {
		selectDevice(context).then(() => {
			vscode.window.setStatusBarMessage(`Selected ${serialDevice.port} at baud ${serialDevice.baud}`);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to find new device. ${err}`);
		});
	});


	const subscriptions = [
		microPyTerm,
		sendTextTermCommand,
		selectDeviceCommand
	];

	context.subscriptions.push.apply(context.subscriptions, subscriptions);
}

function selectDevice(context: vscode.ExtensionContext) {
	return new Promise((resolve, reject) => {
		const statusBarMsg = vscode.window.setStatusBarMessage('Selecting USB-to-Serial device...$(sync~spin)');
		serialConnection.selectDevice().then((newSerialDevice) => {
			serialDevice = newSerialDevice;
			context.workspaceState.update(PORT_PATH_KEY, serialDevice.port);
			context.workspaceState.update(BAUD_RATE_KEY, serialDevice.baud);
			statusBarMsg.dispose();
			resolve();
		}).catch((err) => {
			statusBarMsg.dispose();
			reject(err);
		});
	});
}

function connectTerminalToREPL(): Promise<boolean> {
	return new Promise((resolve, reject) => {
		const statusBarMsg = vscode.window.setStatusBarMessage(`Opening MicroPython REPL...$(sync~spin)`);
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			// Ensure REPL object exists.
			if (repl === undefined) {
				repl = new REPL(terminal, serialDevice);
			}
			if (terminal !== undefined) {
				repl.connect().then((result) => {
					statusBarMsg.dispose();
					resolve(true);
				}).catch((err) => {
					vscode.window.showErrorMessage(err);
					statusBarMsg.dispose();
					reject(false);
				});
			}
		}).catch((err) => {
			statusBarMsg.dispose();
			window.showErrorMessage('Unable find or create MicroPython terminal.');
			reject(false);
		});
	});
}

export function deactivate() {
	if (ensureTerminalExists()) {
		for (let i = 0; i < vscode.window.terminals.length; i++) {
			const terminal = vscode.window.terminals[i];
			if (terminal.name === "MicroPython") {
				repl.quit().then(() => {
					terminal.dispose();
				}).catch(async (err) => {
					vscode.window.showErrorMessage('Failed to shutdown MicroPython REPL.');
					await delay(500);
					terminal.dispose();
				});
			}	
		}
	}
}
