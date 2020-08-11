// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { window } from 'vscode';
const SerialPort = require('serialport');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {



	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "micro-python-terminal" is now active!');

	console.log(vscode.window.terminals.find(term => term.name === 'MicroPython'));

	


	
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('micro-python-terminal.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from µ-python-terminal!');
	});

	let microPyTerm = vscode.commands.registerCommand('micro-python-terminal.createTerm', () => {
		


		if (ensureTerminalExists()) {
			const terminal = selectMicroPythonTerm(vscode.window.terminals);
			if (terminal !== undefined) {
				terminal.show();
				selectPort().then((port) => {
					terminal.sendText(`screen ${port}`, true);
				}).catch((err) => {
					console.log(err);
				});
			}
		}
	});

	context.subscriptions.push(disposable);
}

function selectMicroPythonTerm(terminals: readonly vscode.Terminal[]): vscode.Terminal {
	if (undefined === terminals.find(term => term.name === 'MicroPython')) {
		const terminal = vscode.window.createTerminal({
			name: `MicroPython`,
			hideFromUser: false
		} as any);
		return terminal;
	} else {
		return <vscode.Terminal>terminals.find(term => term.name === 'MicroPython');
	}
}

function selectTerminal(): Thenable<vscode.Terminal | undefined> {
	interface TerminalQuickPickItem extends vscode.QuickPickItem {
		terminal: vscode.Terminal;
	}
	const terminals = <vscode.Terminal[]>(<any>vscode.window).terminals;
	const items: TerminalQuickPickItem[] = terminals.map(t => {
		return {
			label: `name: ${t.name}`,
			terminal: t
		};
	});
	return vscode.window.showQuickPick(items).then(item => {
		return item ? item.terminal : undefined;
	});
}

function ensureTerminalExists(): boolean {
	if ((<any>vscode.window).terminals.length === 0) {
		vscode.window.showErrorMessage('No active terminals');
		return false;
	}
	return true;
}

function readAvailablePorts()  {
	return new Promise<string[]>((resolve, reject) => {
		var paths = new Array<string>();
		SerialPort.list().then((ports: [any]) => {
			ports.forEach(port => {
				paths.push(port.path);
			});
			resolve(paths);
		}).catch((err: any) => {
			console.log(err);
			reject(['No devices found.']);
		});;
	});
}

function sendTextToTerm(text: string) {
	if (ensureTerminalExists()) {
		selectTerminal().then(terminal => {
			if (terminal) {
				terminal.sendText(text);
			}
		});
	}
}

export function checkIfMicroPyTermExists(terminals: readonly vscode.Terminal[]): boolean {
	return undefined !== selectMicroPythonTerm(terminals);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (ensureTerminalExists()) {
		selectTerminal().then(terminal => {
			if (terminal) {
				terminal.dispose();
			}
		});
	}
}

export async function showQuickPick(items: string[]) {
	return new Promise(async (resolve, reject) => {
		const result = await window.showQuickPick(items, { placeHolder: 'USB Devices.' });
		resolve(result);
	});

}

export async function selectPort() {
	return new Promise((resolve, reject) => {
		readAvailablePorts().then((paths) => {
			resolve(showQuickPick(paths));
		}).catch((err) => {
			reject(['Error finding device.'])
		});
	});
}
