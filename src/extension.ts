import { MicroPythonTerminal } from './microPythonTerminal';
import * as vscode from 'vscode';
import { Terminal } from 'vscode';
import { window, Range } from 'vscode';
import { ISerialDevice } from './SerialDevice';
import { MicroPythonREPL } from './microPythonREPL';
import { SerialDeviceSelector, PORT_PATH_KEY, BAUD_RATE_KEY } from "./serialDeviceSelector";
import { delay, selectMicroPythonTerm } from './util';

// DONE: If "Send Text" opens the terminal, add wait to ensure
//		 no text is loss to warming up.
// DONE: Handle sending empty text to terminal.
// DONE: Test disconnect, reconnect.
// DONE: sendSelectedText doesn't time out.  Add a maximum
//       number of retries before discard text and throwing error.


// TODO: Write README
// TODO: Test connect with no device.
// TODO: Test Windows and MacOS
// TODO: Test changing port and baud after opening terminal.


let microREPL: MicroPythonREPL | undefined;
let upyTerminal: MicroPythonTerminal | undefined;
let emitter: typeof vscode.EventEmitter;

// https://vshaxe.github.io/vscode-extern/vscode/Pseudoterminal.html
export function activate(context: vscode.ExtensionContext) {
	
	let port = <string>context.workspaceState.get(PORT_PATH_KEY);
	let baud = <number>context.workspaceState.get(BAUD_RATE_KEY);
	
	// TODO: Create a unit test to clear that file and test
	//       creating a terminal triggers checkIfSerialDeviceExists.
	console.log(context.storagePath);

	const microPyTermCommand = vscode.commands.registerCommand('micro-python-terminal.createTerm', async () => {
		let serialDevice = await checkIfSerialDeviceExists(context, port, baud);
		createMicroREPL(serialDevice).then((result) => {
			console.log(result);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to create a MicroPython terminal. ${err}`);
		});
	});

	const sendTextTermCommand = vscode.commands.registerCommand('micro-python-terminal.sendTextTermCommand', async () => {
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if(undefined !== terminal) {
				let serialDevice = await checkIfSerialDeviceExists(context, port, baud);
				await createMicroREPL(serialDevice);
			}
			if (undefined !== window.activeTextEditor?.document) {
				const doc = window.activeTextEditor?.document;
				const { start, end } = window.activeTextEditor.selection;
				const textRange = new Range(start, end);

				let chunk = doc.getText(textRange);
				if(microREPL !== undefined) {
					await microREPL.sendSelectedText(chunk);
				}
			}

		}).catch((err) => {
			window.showErrorMessage('Unable find or create MicroPython terminal.');
		});
	});

	const selectDeviceCommand = vscode.commands.registerCommand('micro-python-terminal.selectDevice', async () => {
		selectDevice(context).then((serialDevice) => {
			vscode.window.setStatusBarMessage(`Selected ${serialDevice.port} at baud ${serialDevice.baud}`);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to find new device. ${err}`);
		});
	});

	const clearLogs = vscode.commands.registerCommand('micro-python-terminal.clearLogs', async () => {
		selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
			if (terminal !== undefined && microREPL !== undefined) {
				microREPL.clearLog();
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
	vscode.window.onDidCloseTerminal(shutdown);
	context.subscriptions.push.apply(context.subscriptions, subscriptions);
}

export function checkIfSerialDeviceExists(context: vscode.ExtensionContext, port: string, baud: number): Promise<ISerialDevice> {
	return new Promise((resolve, reject) => {
		if(port !== undefined && baud !== undefined) {
			resolve(new ISerialDevice(port, baud));
	   	} else {
		   selectDevice(context).then((serialDevice) => {
			   resolve(serialDevice);
		   }).catch((err) => {
			   reject(err);
		   });
	   	}
	});
}

export function selectDevice(context: vscode.ExtensionContext): Promise<ISerialDevice> {
	return new Promise((resolve, reject) => {
		const statusBarMsg = vscode.window.setStatusBarMessage('Selecting USB-to-Serial device...$(sync~spin)');
		const serialConnection = new SerialDeviceSelector();
		serialConnection.selectDevice().then((serialDevice) => {
			context.workspaceState.update(PORT_PATH_KEY, serialDevice.port);
			context.workspaceState.update(BAUD_RATE_KEY, serialDevice.baud);
			statusBarMsg.dispose();
			resolve(serialDevice);
		}).catch((err) => {
			statusBarMsg.dispose();
			vscode.window.showErrorMessage('Failed to set port or baud.');
			reject(err);
		});
	});
}

export function createMicroREPL(serialDevice: ISerialDevice, logPath: string = ""): Promise<MicroPythonREPL> {
	return new Promise(async (resolve, reject) => {
		vscode.window.setStatusBarMessage(`Opening MicroPython REPL...$(sync~spin)`);
		if(upyTerminal === undefined) {
			upyTerminal = new MicroPythonTerminal();
			upyTerminal.terminal.show();
			await delay(300);
		} else {
			upyTerminal.terminal.show();
			upyTerminal.terminalShowing = true;
		}
		if(microREPL === undefined) {
			microREPL = new MicroPythonREPL(upyTerminal, serialDevice, logPath);
		}
		microREPL.openSerialConnection();
		microREPL.waitForReady().then(async (result) => {
			if(microREPL !== undefined && upyTerminal !== undefined) {
				upyTerminal.terminalShowing;
				vscode.window.setStatusBarMessage(`Opened MicroREPL on ${microREPL.serialDevice.port} at ${microREPL.serialDevice.baud}`);
				resolve(microREPL);
			}
		}).catch((err) => {
			reject(err);
		});
	});
}

export async function closeMicroREPL(microPyTerm: MicroPythonREPL) {
	return new Promise(async (resolve, reject) => {
		var terminal = <Terminal>microPyTerm.upyTerminal?.terminal;
		if(terminal !== undefined) {
			terminal.dispose();
			if(terminal.name === "MicroPython") {
				microPyTerm.upyTerminal = undefined;
			}
			await delay(300);
		}
		if(microPyTerm !== undefined) {
			microPyTerm.close().then(() => {
				resolve();
			}).catch((err) => {
				reject(err);
			});
		} else {
			resolve();
		}
	});
}

export function shutdown(terminal: any) {
	upyTerminal = undefined;
	if(microREPL !== undefined) {
		microREPL.close().then((result) => {
			microREPL = undefined;
		}).catch((err) => {
			
		});
	}
}