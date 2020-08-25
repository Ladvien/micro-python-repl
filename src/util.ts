import { window, Terminal } from 'vscode';

export async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

export function checkIfMicroPyTermExists(terminals: readonly Terminal[]): boolean {
    return undefined !== selectMicroPythonTerm(terminals);
}

export function ensureTerminalExists(): boolean {
    if ((<any>window).terminals.length === 0) {
        window.showErrorMessage('No active terminals');
        return false;
    }
    return true;
}
