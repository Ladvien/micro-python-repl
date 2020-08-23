import * as vscode from 'vscode';
import { window } from 'vscode';
import { Range } from 'vscode';
import SerialPort = require('serialport');
import { ISerialDevice } from './SerialDevice';
import { SerialDeviceSelector, PORT_PATH_KEY, BAUD_RATE_KEY } from "./serialDeviceSelector";
import { delay } from './util';

import { MicroPythonTerminal } from './microPythonTerminal'; 

// DONE: Wait terminal to warm up before opening REPL.
// DONE: Determine why "\n\n" causes REPL problems.
// DONE: Move useDeviceToConnectToRepl to REPL class.

// TODO: Track indenting +/-.
// TODO: Don't allow use of terminal until VSCode fully initializes.
// TODO: Find regex to remove comments before sending, Test case:
	// def map_val(x, in_min, in_max, out_min, out_max): # This comment breaks the indent
	//    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min # 1

const SEND_THROTTLE = 100;

let serialDevice: ISerialDevice;
let microPyTerm: MicroPythonTerminal;

// https://vshaxe.github.io/vscode-extern/vscode/Pseudoterminal.html
export function activate(context: vscode.ExtensionContext) {
	serialDevice = new ISerialDevice(<string>context.workspaceState.get(PORT_PATH_KEY), <number>context.workspaceState.get(BAUD_RATE_KEY));

	let microPyTermCommand = vscode.commands.registerCommand('micro-python-terminal.createTerm', () => {
		connectTerminalToREPL().then((result) => {
			console.log(result);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to create a MicroPython terminal. ${err}`);
		});
	});

	let sendTextTermCommand = vscode.commands.registerCommand('micro-python-terminal.sendTextTermCommand', async () => {
		microPyTerm.selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if (undefined !== terminal){
				if (undefined !== window.activeTextEditor?.document) {
					const doc = window.activeTextEditor?.document;
					const { start, end } = window.activeTextEditor.selection;
					const textRange = new Range(start, end);
	
					let chunk = doc.getText(textRange);
					await microPyTerm.sendSelectedText(chunk);
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
		microPyTermCommand,
		sendTextTermCommand,
		selectDeviceCommand
	];

	context.subscriptions.push.apply(context.subscriptions, subscriptions);
}

function selectDevice(context: vscode.ExtensionContext) {
	return new Promise((resolve, reject) => {
		const statusBarMsg = vscode.window.setStatusBarMessage('Selecting USB-to-Serial device...$(sync~spin)');
		const serialConnection = new SerialDeviceSelector();
		serialConnection.selectDevice().then((newSerialDevice) => {
			serialDevice = newSerialDevice;
			context.workspaceState.update(PORT_PATH_KEY, serialDevice.port);
			context.workspaceState.update(BAUD_RATE_KEY, serialDevice.baud);
			statusBarMsg.dispose();
			resolve();
		}).catch((err) => {
			statusBarMsg.dispose();
			vscode.window.showErrorMessage('Failed to set port or baud.');
			reject(err);
		});
	});
}

function connectTerminalToREPL(): Promise<boolean> {
	return new Promise((resolve, reject) => {
		const statusBarMsg = vscode.window.setStatusBarMessage(`Opening MicroPython REPL...$(sync~spin)`);
		// Ensure REPL object exists.
		if (microPyTerm === undefined) {
			microPyTerm = new MicroPythonTerminal(serialDevice);
		}
		microPyTerm.selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if (terminal !== undefined) {
				resolve();
			}
		}).catch((err) => {
			statusBarMsg.dispose();
			window.showErrorMessage('Unable find or create MicroPython terminal.');
			reject(false);
		});
	});
}

export function deactivate() {
	if (microPyTerm.ensureTerminalExists()) {
		for (let i = 0; i < vscode.window.terminals.length; i++) {
			const terminal = vscode.window.terminals[i];
			if (terminal.name === "MicroPython") {
				microPyTerm.shutdown().then(async (result) => {
					console.log('here');
					delay(5000);
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