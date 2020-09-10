import { window, Terminal } from 'vscode';

export async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getUserText(placeholder = '', password = false): Promise<String> {
    return new Promise(async (resolve) => {
        resolve(await window.showInputBox({ placeHolder: placeholder, password: password }));
    });
}

export async function showQuickPick(items: any[], placeHolderText: string): Promise<String> {
	return new Promise(async (resolve) => {
        const result = await window.showQuickPick(items.map(String), { placeHolder: placeHolderText });
        const selectedValue = result ? result : 'Failed to get user value.';
        resolve(selectedValue);
    });
}

export function selectMicroPythonTerm(terminals: readonly Terminal[]): Promise<Terminal> {
    return new Promise(async (resolve) => {
        if (undefined === terminals.find(term => term.name === 'MicroPython')) {
            const terminal = window.createTerminal({
                name: `MicroPython`,
                hideFromUser: true
            } as any);
            await delay(1000);
            resolve(terminal);
        } else {
            resolve(<Terminal>terminals.find(term => term.name === 'MicroPython'));
        }
    });
}
