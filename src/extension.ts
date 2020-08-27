import * as vscode from 'vscode';
import { window, Range } from 'vscode';
import { ISerialDevice } from './SerialDevice';
import { MicroPythonTerminal } from './microPythonTerminal';
import { SerialDeviceSelector, PORT_PATH_KEY, BAUD_RATE_KEY } from "./serialDeviceSelector";
import { delay, selectMicroPythonTerm, ensureTerminalExists } from './util';

// TODO: Write README
// TODO: Test disconnect, reconnect.
// TODO: Test connect whe no device.
// TODO: Test Windows and MacOS
// TODO: Test changing port and baud after opening terminal.
// TODO: Handle sending empty text to terminal.
// TODO: If "Send Text" opens the terminal, add wait to ensure
//		 no text is loss to warming up.

let serialDevice: ISerialDevice;
let microPyTerm: MicroPythonTerminal;

// https://vshaxe.github.io/vscode-extern/vscode/Pseudoterminal.html
export function activate(context: vscode.ExtensionContext) {

	serialDevice = new ISerialDevice(<string>context.workspaceState.get(PORT_PATH_KEY), <number>context.workspaceState.get(BAUD_RATE_KEY));

	const microPyTermCommand = vscode.commands.registerCommand('micro-python-terminal.createTerm', () => {
		connectTerminalToREPL().then((result) => {
			console.log(result);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to create a MicroPython terminal. ${err}`);
		});
	});

	const sendTextTermCommand = vscode.commands.registerCommand('micro-python-terminal.sendTextTermCommand', async () => {
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if(undefined !== terminal) {
				terminal = await connectTerminalToREPL();
			}
			if (undefined !== window.activeTextEditor?.document) {
				const doc = window.activeTextEditor?.document;
				const { start, end } = window.activeTextEditor.selection;
				const textRange = new Range(start, end);

				let chunk = doc.getText(textRange);
				await microPyTerm.sendSelectedText(chunk);
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
			if (undefined !== terminal) {
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

function connectTerminalToREPL(): Promise<vscode.Terminal> {
	return new Promise((resolve, reject) => {
		const statusBarMsg = vscode.window.setStatusBarMessage(`Opening MicroPython REPL...$(sync~spin)`);
		if (microPyTerm === undefined) {
			microPyTerm = new MicroPythonTerminal(serialDevice);
		}
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if (terminal !== undefined) {
				resolve(terminal);
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
				microPyTerm.close();
				terminal.dispose();
			}
		}
	}
}