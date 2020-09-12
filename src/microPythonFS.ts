import { MicroPythonREPL } from './microPythonREPL';
import * as termCon from './terminalConstants';
import { typeError } from './util';

const FS_CMD_FAIL_MESSAGE = `Failed to execute file-system command.`;

async function executeFSCommand(microREPL: MicroPythonREPL, command:string): Promise<Boolean> {
    try {
        microREPL.captureOutput = true;
        await microREPL.sendSelectedText(command);
        const capture = microREPL.getCaptureBuffer();
        microREPL.getREPLPrompt();
        if(capture.includes(termCon.PY_CMD_FAILED_MSG)) { throw Error(`Failed to execute file-system command.`); }
        return true;
    } catch (error) {
        throw new Error(FS_CMD_FAIL_MESSAGE);
    }
}

function createFileWriteToFileString(text: string, filePath: string): string {
    const rawLines = text.split('\n');
    let fileWriteCmd = `with open("${filePath}", "w") as f:` + '\n';
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        fileWriteCmd += `    f.write("` + line + `\\n")`; 
        fileWriteCmd += '\n';
    }
    return fileWriteCmd;
}

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
        const fileWriteCMD = createFileWriteToFileString(file, filePath);
        await microREPL.sendSelectedText(fileWriteCMD);
    } catch (error) {
        throw new Error(typeError(error).message);
    }
}

export async function fileExistsOnDev(microREPL: MicroPythonREPL, filePath: string): Promise<Boolean> {
    
    const fileExistsCmd =    `try:\n` +
                             `    with open ("${filePath}") as f:\n` +
                             `        pass\n` +
                             `except:\n` +
                             `    print('${termCon.PY_CMD_FAILED_MSG}')\n`;
            
    try {
        await executeFSCommand(microREPL, fileExistsCmd);
        return true;
    } catch (error) {
        const e = typeError(error);
        if(e.message === FS_CMD_FAIL_MESSAGE){ return false; }
        throw e;
    }
}

