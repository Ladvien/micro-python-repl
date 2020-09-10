import { MicroPythonTerminal } from './microPythonTerminal';
import * as vscode from 'vscode';
import { Terminal } from 'vscode';
import { window, Range } from 'vscode';
import { ISerialDevice } from './interfaces/SerialDevice';
import { MicroPythonREPL } from './microPythonREPL';
import { SerialDeviceSelector, PORT_PATH_KEY, BAUD_RATE_KEY } from "./serialDeviceSelector";
import { delay, selectMicroPythonTerm, showQuickPick, getUserText } from './util';
import { getWifiSSIDInRange, writeBoot } from './deviceSystem';
import { resolve } from 'path';

const logPath = '/home/ladvien/micro-python-terminal/src/test/log.txt';
let microREPL: MicroPythonREPL | undefined;

export function activate(context: vscode.ExtensionContext) {

	const microPyTermCommand = vscode.commands.registerCommand('micro-python-terminal.createTerm', async () => {
		if(microREPL === undefined) {
			let serialDevice = await checkIfSerialDeviceExists(context);
			await createMicroREPL(serialDevice);
		}
	});

	const sendTextTermCommand = vscode.commands.registerCommand('micro-python-terminal.sendTextTermCommand', async () => {
		if(microREPL === undefined) {
			let serialDevice = await checkIfSerialDeviceExists(context);
			await createMicroREPL(serialDevice, logPath);
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
	});

	const selectDeviceCommand = vscode.commands.registerCommand('micro-python-terminal.selectDevice', async () => {
		selectDevice(context).then((serialDevice) => {
			vscode.window.setStatusBarMessage(`Selected ${serialDevice.port} at baud ${serialDevice.baud}`);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to find new device. ${err}`);
		});
	});

	const clearLogs = vscode.commands.registerCommand('micro-python-terminal.clearLogs', async () => {
		let serialDevice = await checkIfSerialDeviceExists(context);
		createMicroREPL(serialDevice).then((result) => {
			console.log(result);
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to create a MicroPython terminal. ${err}`);
		});
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

	const setupWifi = vscode.commands.registerCommand('micro-python-terminal.setupWifi', async () => {
		
		let serialDevice = await checkIfSerialDeviceExists(context);
		createMicroREPL(serialDevice).then(() => {
			if(microREPL !== undefined){

				// Get list of WiFi.
				getWifiSSIDInRange(microREPL).then((ssids) => {
					
					// Have the user select a SSID.
					showQuickPick(ssids.map(x =>  <string>x.ssid ), 'No WiFI devices found.').then(async (selectedSSID) => {
						// Get password
						const password = await getUserText('Enter WiFi passsword', true);
						if(microREPL !== undefined){
							writeBoot(microREPL, 'Wireless-N(2.4G)', 'test').then((result) => {
								resolve();
							}).catch((err) => {
								vscode.window.showErrorMessage('Failed to write boot.py during WiFi selection.', err);
							});
						}
					}).catch((err) => {
						vscode.window.showErrorMessage('Failed to select WiFi device', err);
					});
				}).catch((err) => {
					vscode.window.showErrorMessage('Failed finding WiFi devices in range of MicroPython device.', err);
				});
			}
		}).catch((err) => {
			vscode.window.showErrorMessage(`Unable to create a MicroPython terminal. ${err}`);
		});

	});

	const subscriptions = [
		microPyTermCommand,
		sendTextTermCommand,
		selectDeviceCommand,
		setupWifi
	];
	vscode.window.onDidCloseTerminal(shutdown);
	context.subscriptions.push.apply(context.subscriptions, subscriptions);
}

export function checkIfSerialDeviceExists(context: vscode.ExtensionContext): Promise<ISerialDevice> {
	return new Promise((resolve, reject) => {
		let port = <string>context.workspaceState.get(PORT_PATH_KEY);
		let baud = <number>context.workspaceState.get(BAUD_RATE_KEY);	
		if(port !== undefined && baud !== undefined) {
			resolve(<ISerialDevice>{port: port, baud: baud});
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
		if(microREPL === undefined) {
			microREPL = new MicroPythonREPL(new MicroPythonTerminal(), serialDevice, logPath);
			await delay(1000);
		}
		if(logPath !== '') { microREPL.logPath = logPath; }
		if(microREPL.upyTerminal === undefined) {
			microREPL.attachTerminal(new MicroPythonTerminal());
		}
		microREPL.openSerialConnection();
		microREPL.waitForReady().then(async (result) => {
			if(microREPL !== undefined) {
				vscode.window.setStatusBarMessage(`Opened MicroREPL on ${microREPL.serialDevice.port} at ${microREPL.serialDevice.baud}`);
				resolve(microREPL);
			}
		}).catch((err) => {
			reject(err);
		});
	});
}

export async function closeMicroREPL(microREPL: MicroPythonREPL) {
	return new Promise(async (resolve, reject) => {
		var terminal = <Terminal>microREPL.upyTerminal?.terminal;
		if(terminal !== undefined) {
			terminal.dispose();
			if(terminal.name === "MicroPython") {
				microREPL.upyTerminal = undefined;
				await delay(300);
			}
		}
		microREPL.close().then(() => {
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});
}

export function shutdown(terminal: any) {
	if(microREPL !== undefined) {
		closeMicroREPL(microREPL).then((result) => {
			console.log(result);
		}).catch((err) => {
			console.log(err);
		});
	}
}
