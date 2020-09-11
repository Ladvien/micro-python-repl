import { MicroPythonREPL } from './microPythonREPL';
import * as termCon from './terminalConstants';
import { typeError } from './util';

export async function deleteFileOnDev(microREPL: MicroPythonREPL, filePath: string) {
    const fileWriteCmd =    `try:\n` +
                            `    import uos\n` +
                            `    uos.remove("${filePath}")\n` +
                            `except:\n` +
                            `    print('${termCon.PY_CMD_FAILED_MSG}')\n`;

    try {
        microREPL.captureOutput = true;
        await microREPL.sendSelectedText(fileWriteCmd);
        const capture = microREPL.getCaptureBuffer();
        microREPL.getREPLPrompt();
        if(capture.includes(termCon.PY_CMD_FAILED_MSG)) { throw Error(`Failed to remove ${filePath}`); }
    } catch (error) {
        throw new Error(`Failed to remove ${filePath}.`);
    }
}

export async function writeFileOnDev(microREPL: MicroPythonREPL, filePath: string, file: string, overwrite = false) {
    try {
        if(overwrite){ await deleteFileOnDev(microREPL, filePath); }
    } catch (error) {}
    try {
        const fileWriteCMD = createFileWriteToFileString(microREPL, file, filePath);
        await microREPL.sendSelectedText(fileWriteCMD);
    } catch (error) {
        throw new Error(typeError(error).message);
    }
}

function createFileWriteToFileString(microREPL: MicroPythonREPL, text: string, filePath: string): string {
    const rawLines = text.split('\n');
    let fileWriteCmd = `with open("${filePath}", "w") as f:` + '\n';
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        fileWriteCmd += `    f.write("` + line + `\\n")`; 
        fileWriteCmd += '\n';
    }
    return fileWriteCmd;
}