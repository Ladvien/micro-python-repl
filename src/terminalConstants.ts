

export class Constants {

    EXEC: string;
    NEWLINE: string;
    WELCOME_MESSAGE: string;

    constructor(){
        if(process.platform === 'win32'){ this.EXEC = '\r'; }
        else { this.EXEC =  '\r\n'; }
        if(process.platform === 'win32'){ this.NEWLINE = '\r'; }
        else { this.NEWLINE =  '\r\n'; }
        this.WELCOME_MESSAGE = `Welcome to MicroPython Terminal for VSCode.${this.NEWLINE}Written by C. Thomas Brittain${this.NEWLINE}`;
    }
    

    DELAY_BETWEEN_EXEC     = 60;        
    DELAY_BEFORE_WELCOME   = 1200;
    
    TERM_COLUMNS           = 120;
    TERM_ROWS              = 20;
    
    SPACES_PER_INDENT      = 4;
    
    PY_CMD_FAILED_MSG      = `MicroPython: failed`;
    
    RAW_REPL_MODE          = `\u0001`;
    EXEC_RAW_INPUT         = `\u0004`;
    REPL_MODE              = `\u0002`;
    PASTE_MODE             = `\u0005`;
    
    ESC                    = `\u001b`;
    CLEAR_ALL              = `${this.ESC}[2J`;
    CLEAR_LINE             = `${this.ESC}[2K\r`;
    RESET                  = `${this.ESC}c`;
    RESET_CUR              = `${this.ESC}[0;0H`;
    
    UP                     = `${this.ESC}\u005b\u0041`;
    DOWN                   = `${this.ESC}\u005b\u0042`;
    RIGHT                  = `${this.ESC}\u005b\u0043`;
    LEFT                   = `${this.ESC}\u005b\u0044`;
    
    BACKSPACE              = '\u0008';
    BACKSPACE_CLEAR        = `${this.BACKSPACE} $this.{BACKSPACE}`;
    REDUCE_INDENT          = this.BACKSPACE; 

    RED                    = `${this.ESC}[31m`;
    GREEN                  = `${this.ESC}[38;5;82m`;
    PURPLE                 = `${this.ESC}[38;5;128m`;
    RESET_COLOR            = `${this.ESC}[39;49m`;
    
           
}
