export const DELAY_BETWEEN_EXEC     = 60;        
export const DELAY_BEFORE_WELCOME   = 1200;

export const TERM_COLUMNS           = 120;
export const TERM_ROWS              = 20;

export const SPACES_PER_INDENT      = 4;

export const ESC                    = `\u001b`;
export const CLEAR_ALL              = `${ESC}[2J`;
export const CLEAR_LINE             = `${ESC}[2K\r`;
export const RESET                  = `${ESC}c`;
export const RESET_CUR              = `${ESC}[0;0H`;

export const UP                     = `${ESC}\u005b\u0041`;
export const DOWN                   = `${ESC}\u005b\u0042`;
export const RIGHT                  = `${ESC}\u005b\u0043`;
export const LEFT                   = `${ESC}\u005b\u0044`;

export const BACKSPACE              = '\u0008';
export const BACKSPACE_CLEAR        = `${BACKSPACE} ${BACKSPACE}`;
export const REDUCE_INDENT          = BACKSPACE; 
export const EXEC                   = '\r\n';
export const NEWLINE                = '\r\n';

export const RED                    = `${ESC}[31m`;
export const GREEN                  = `${ESC}[38;5;82m`;
export const PURPLE                 = `${ESC}[38;5;128m`;
export const RESET_COLOR            = `${ESC}[39;49m`;

export const WELCOME_MESSAGE        = `Welcome to MicroPython Terminal for VSCode.${NEWLINE}Written by C. Thomas Brittain${NEWLINE}`; 
