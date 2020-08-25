import { window } from 'vscode';

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