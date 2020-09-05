import * as vscode from 'vscode';
import { Terminal } from 'vscode';
import { window, Range } from 'vscode';
import { ISerialDevice } from './SerialDevice';
import { MicroPythonREPL } from './microPythonREPL';
import { SerialDeviceSelector, PORT_PATH_KEY, BAUD_RATE_KEY } from "./serialDeviceSelector";
import { delay, selectMicroPythonTerm, ensureTerminalExists } from './util';

// DONE: If "Send Text" opens the terminal, add wait to ensure
//		 no text is loss to warming up.
// DONE: Handle sending empty text to terminal.


// TODO: Write README
// TODO: Test disconnect, reconnect.
// TODO: Test connect with no device.
// TODO: Test Windows and MacOS
// TODO: Test changing port and baud after opening terminal.
// TODO: sendSelectedText doesn't time out.  Add a maximum
//       number of retries before discard text and throwing error.


let serialDevice: ISerialDevice;
let microPyTerm: MicroPythonREPL | undefined;

// https://vshaxe.github.io/vscode-extern/vscode/Pseudoterminal.html
export function activate(context: vscode.ExtensionContext) {

	serialDevice = new ISerialDevice(<string>context.workspaceState.get(PORT_PATH_KEY), <number>context.workspaceState.get(BAUD_RATE_KEY));

	const microPyTermCommand = vscode.commands.registerCommand('micro-python-terminal.createTerm', () => {
		createMicroPythonREPL(serialDevice).then((result) => {
			console.log(result);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to create a MicroPython terminal. ${err}`);
		});
	});

	const sendTextTermCommand = vscode.commands.registerCommand('micro-python-terminal.sendTextTermCommand', async () => {
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if(undefined !== terminal) {
				await createMicroPythonREPL(serialDevice);
			}
			if (undefined !== window.activeTextEditor?.document) {
				const doc = window.activeTextEditor?.document;
				const { start, end } = window.activeTextEditor.selection;
				const textRange = new Range(start, end);

				let chunk = doc.getText(textRange);
				if(microPyTerm !== undefined) {
					await microPyTerm.sendSelectedText(chunk);
				}
			}

		}).catch((err) => {
			window.showErrorMessage('Unable find or create MicroPython terminal.');
		});
	});

	const selectDeviceCommand = vscode.commands.registerCommand('micro-python-terminal.selectDevice', async () => {
		selectDevice(context).then(() => {
			vscode.window.setStatusBarMessage(`Selected ${serialDevice.port} at baud ${serialDevice.baud}`);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to find new device. ${err}`);
		});
	});

	const clearLogs = vscode.commands.registerCommand('micro-python-terminal.clearLogs', async () => {
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if (terminal !== undefined && microPyTerm !== undefined) {
				microPyTerm.clearLog();
			} else {
				window.showErrorMessage('No open document.');
			}
		}).catch((err) => {
			window.showErrorMessage('Unable find or create MicroPython terminal.');
		});
	});

	const subscriptions = [
		microPyTermCommand,
		sendTextTermCommand,
		selectDeviceCommand,
		clearLogs
	];
	vscode.window.onDidCloseTerminal(closeTerm);
	context.subscriptions.push.apply(context.subscriptions, subscriptions);
}

export function selectDevice(context: vscode.ExtensionContext) {
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

export function createMicroPythonREPL(serialDevice: ISerialDevice): Promise<MicroPythonREPL> {
	return new Promise(async (resolve, reject) => {
		const statusBarMsg = vscode.window.setStatusBarMessage(`Opening MicroPython REPL...$(sync~spin)`);
		if (microPyTerm === undefined) {
			microPyTerm = new MicroPythonREPL(serialDevice);
		}
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if (terminal !== undefined && microPyTerm !== undefined) {
				microPyTerm.waitForReady().then((result) => {
					if(microPyTerm !== undefined) {
						vscode.window.setStatusBarMessage(`Opened ${microPyTerm.serialDevice.port} at ${microPyTerm.serialDevice.baud}`);
						resolve(microPyTerm);
					}
					reject('MicroPython terminal undefined');
				}).catch((err) => {
					reject(err);
				});
			}
		}).catch((err) => {
			statusBarMsg.dispose();
			window.showErrorMessage('Unable find or create MicroPython terminal.', err);
			reject(err);
		});
	});
}

export async function closeTerm(terminal: any) {
	return new Promise(async (resolve, reject) => {
		terminal.dispose();
		if(terminal.name === "MicroPython") {
			if(microPyTerm !== undefined) {
				microPyTerm.close().then(() => {
					terminal = undefined;
					microPyTerm = undefined;
					resolve();
				}).catch((err) => {
					vscode.window.showErrorMessage(err);
					reject(err);
				});
			}
		}
		await delay(300);
	});
}