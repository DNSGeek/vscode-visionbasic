'use strict';

const vscode = require('vscode');

// ─── Complete command reference from DNSGeek cheat sheet ─────────────────────
const HOVER_DOCS = {

  // Editing Keywords
  'ASSEM':    { sig: 'ASSEM',                         desc: 'Switches into assembler mode. Mnemonics must be enclosed in `[]` brackets. Use `BASIC` to return.' },
  'BANK':     { sig: 'BANK [bank[-bank][, on/off]]',  desc: 'Display current bank number, or change to specified bank. If on/off specified, enables or disables the banks.' },
  'BASIC':    { sig: 'BASIC',                         desc: 'Switches out of assembler mode, back to BASIC mode.' },
  'COMP':     { sig: 'COMP ["filename"[, devnum]]',   desc: 'Compiles the program in memory and optionally saves it to a file. `filename` must be 12 characters or less.' },
  'DELETE':   { sig: 'DELETE [start - end]',          desc: 'Deletes a range of lines from `start` to `end`. With no parameters, acts like NEW.' },
  'DESC':     { sig: 'DESC line#, label',             desc: 'Creates a subroutine label and starts the code at `line#`.' },
  'ERROR':    { sig: 'ERROR',                         desc: 'Displays the errors.' },
  'EXEC':     { sig: 'EXEC command block  (shorthand: >)', desc: 'Runs a single line in immediate mode.' },
  'FAST':     { sig: 'FAST',                          desc: 'Enables speed up of some commands.' },
  'FIND':     { sig: 'FIND text',                     desc: 'Searches the program in the current bank for lines containing `text`. Do not use quotes for keywords. Prefix assembly instructions with `[`.' },
  'LIST':     { sig: 'LIST [line#[-line#]]',           desc: 'Displays the program in memory. Can optionally display only lines between the given parameters.' },
  'LISTER':   { sig: 'LISTER [line#]',                desc: 'A scrollable LIST. If `line#` specified, starts at that line.' },
  'LITE':     { sig: 'LITE [0/1]',                    desc: 'With no parameter or 1, enables LITE mode. 0 disables it.' },
  'LLIST':    { sig: 'LLIST [line#[-line#[, printer?]]]', desc: 'Displays extended details about the program in memory. If `printer?` is 1, output is sent to a printer.' },
  'NEW':      { sig: 'NEW [bank[-bank]]',             desc: 'Clears the current program bank, or banks specified.' },
  'OLD':      { sig: 'OLD [bank[-bank]]',             desc: 'Attempts to restore the program in the current bank, or banks specified.' },
  'PLIST':    { sig: 'PLIST [line#[-line#]]',         desc: 'Sends the program LIST to a printer.' },
  'QUIT':     { sig: 'QUIT',                          desc: 'Quits Vision BASIC.' },
  'RENUM':    { sig: 'RENUM start-end, new[, step]',  desc: 'Renumbers the lines from `start` to `end` to `new`, using a step of 10 if not specified.' },
  'RUN':      { sig: 'RUN [line#]',                   desc: 'Runs the compiled in-memory program. If not compiled or altered, will compile first. If `line#` specified, starts there.' },
  'SLOW':     { sig: 'SLOW',                          desc: 'Runs at normal C64 speeds.' },
  'VLIST':    { sig: 'VLIST [num]',                   desc: 'Displays all variables from the program in memory. If `num` specified, sends output to a printer.' },

  // Disk and File Commands
  'DEVICE':   { sig: 'DEVICE devnum',                 desc: 'Sets the device number for the default device.' },
  'DIR':      { sig: 'DIR [num]',                     desc: 'Lists the current device\'s directory. If `num` is supplied, output is sent to a printer.' },
  'DISK':     { sig: 'DISK ["command"[, devnum]]',    desc: 'Equivalent to OPEN 15,devnum,15,"command":CLOSE 15. Uses default device if not specified. Initialises if command not specified.' },
  'GSAVE':    { sig: 'GSAVE on',                      desc: 'Saves a copy of C64 RAM to GeoRAM expanded memory. If `on` is 1, enables the back-up feature.' },
  'LOAD':     { sig: 'LOAD "filename"[, devnum]',     desc: 'Loads a file from the default device. If filename not specified, uses last specified filename.' },
  'SAVE':     { sig: 'SAVE "filename"[, devnum]',     desc: 'Saves a file to the default device. Filename must be 12 characters or less.' },
  'VERIFY':   { sig: 'VERIFY "filename"[, devnum]',   desc: 'Verifies the program in memory against a file on the default device.' },

  // Variables
  'CLR':      { sig: 'CLR',                           desc: 'Clears the memory used by all variables.' },
  'DECIMAL':  { sig: 'DECIMAL variable[, variable[, ...]]', desc: 'Creates new decimal (floating point) variables. All variables are integers by default.' },
  'DIM':      { sig: 'DIM [DECIMAL] variable(value)', desc: 'Creates an array variable of `value` size. Optionally DECIMAL for floating point arrays.' },
  'GLOBAL':   { sig: 'GLOBAL',                        desc: 'Restores the global variable scope.' },
  'LET':      { sig: 'LET var = value',               desc: 'Assigns a simple value to a simple variable. Useful for speed — slightly faster than direct assignment.' },
  'LOCAL':    { sig: 'LOCAL',                         desc: 'Starts a local scope for variables.' },
  'TAG':      { sig: 'TAG tag = value',               desc: 'Creates a TAG named `tag` with value `value`. Like a label in assembler. Tags cannot be to the left of an equals sign in a math expression.' },
  'VARIABLES':{ sig: 'VARIABLES [address]',           desc: 'Moves the program variable table to `address`, or 32768 if not specified.' },
  'LABEL':    { sig: 'LABEL',                         desc: 'Identical to TAG.' },

  // Math
  'ABS':      { sig: 'ABS(vov)',                      desc: 'Returns the absolute value of `vov`.' },
  'INT':      { sig: 'INT(vov)',                       desc: 'Returns the integer value of `vov`, rounded down.' },
  'SGN':      { sig: 'SGN(vov)',                       desc: 'Returns the sign of `vov`.' },
  'WHOLE':    { sig: 'WHOLE(vov)',                     desc: 'Returns the integer value of `vov` without rounding.' },
  'FRAC':     { sig: 'FRAC(vov)',                      desc: 'Returns the fractional value of `vov`, stripped of the sign.' },
  'RANDOM':   { sig: 'RANDOM [seed]',                 desc: 'Initialises the random number table. If no parameter, uses SID voice 3. Otherwise seeded with `seed`.' },
  'RND':      { sig: 'RND [0]',                       desc: 'Generates a random number. If 0 supplied, limits numbers to 0-255, otherwise 0-65535. Call RANDOM first to initialise.' },

  // Speedy Math
  'ADD':      { sig: 'ADD vop = vov + vov',           desc: 'Fast addition. Only works with non-arrayed integer variables, tags and pointers.' },
  'COMPARE':  { sig: 'COMPARE vov, vov',              desc: 'Fast comparison. Both parameters must be 2-byte ints.' },
  'DEC':      { sig: 'DEC vop',                       desc: 'Decrements `vop` by 1. Works on non-arrayed integer and decimal variables.' },
  'DOUBLE':   { sig: 'DOUBLE vop',                    desc: 'Multiplies `vop` by 2. Works on non-arrayed integer and decimal variables.' },
  'HALF':     { sig: 'HALF vop',                      desc: 'Divides `vop` by 2. Works on non-arrayed integer and decimal variables.' },
  'INC':      { sig: 'INC vop',                       desc: 'Increments `vop` by 1. Works on non-arrayed integer and decimal variables.' },
  'SUBTRACT': { sig: 'SUBTRACT vop = vov - vov',      desc: 'Fast subtraction. Only works with non-arrayed integer variables, tags and pointers.' },

  // Bitmap Commands
  'BITMAP':   { sig: 'BITMAP [bmp, multicolor, map, drawto, screen, color1, color2, color3, clearcol, clearmap]', desc: 'Turns modes bmp and multicolor on (1) or off (0).' },
  'BMPCLR':   { sig: 'BMPCLR [clearmap[, clearcol]]', desc: 'Clears the currently visible bitmap screen if `clearmap` is 1, and color screen if `clearcol` is 1. If neither specified, clears both.' },
  'BMPCOL':   { sig: 'BMPCOL screen, color1, color2, color3, clearcol[, clearmap]', desc: 'Sets the bitmap colors and defines which screen to use. If `clearmap` is 1, clears the bitmap.' },
  'BMPLOC':   { sig: 'BMPLOC map, drawto',            desc: '`map` sets which bitmap screen is visible (0-7). `drawto` sets which screen will be drawn to with drawing commands.' },
  'HLINE':    { sig: 'HLINE x, y, len, color',        desc: 'Draws a horizontal line starting at (x, y) continuing right for `len` pixels in `color`.' },
  'LIMITS':   { sig: 'LIMITS width, height, xpos, ypos, colorplot', desc: 'Limits the area on the bitmap that drawing commands will affect.' },
  'LINE':     { sig: 'LINE x1, y1[, x2, y2[, color]]', desc: 'Draws a line from (x1, y1) to (x2, y2) in `color`. If x2/y2 not specified, draws to current coordinate.' },
  'PLOT':     { sig: 'PLOT x, y, color',              desc: 'Draws a pixel on the bitmap at coordinates (x, y) in `color`.' },
  'VLINE':    { sig: 'VLINE x, y, len, color',        desc: 'Draws a vertical line starting at (x, y) going down for `len` pixels in `color`.' },

  // Sprite Commands
  'ALLMOBS':  { sig: 'ALLMOBS x0,y0, x1,y1, x2,y2, x3,y3, x4,y4, x5,y5, x6,y6, x7,y7', desc: 'Sets all 8 sprite positions in a single command.' },
  'CODE':     { sig: 'CODE values...',                desc: 'Any code following this command will be stored in memory at the location indicated by the "code" pointer.' },
  'COLLISION':{ sig: 'COLLISION selection',           desc: 'Copies collision registers and zeros the copied register. `selection` 0 = sprite-to-sprite, 1 = sprite-to-foreground.' },
  'DETECT':   { sig: 'DETECT mob#[, mob#[, ...]]',   desc: 'Used after COLLISION. Checks if the specified sprites were involved in a collision.' },
  'MOB':      { sig: 'MOB number, on, multicolor, priority, x, y, x-add, y-add', desc: 'Chooses and initialises a sprite. `number` 0-7, `on` enables/disables, `multicolor` mode, `priority` enables background priority, x/y initial coords, x-add/y-add set offsets.' },
  'MOBCLR':   { sig: 'MOBCLR',                       desc: 'Clears all sprite registers. Recommended at the start of programs using sprites.' },
  'MOBCOL':   { sig: 'MOBCOL color, shared1, shared2', desc: 'Sets sprite colors. `color` sets current sprite color, `shared1`/`shared2` set the shared multicolor sprite colors.' },
  'MOBEXP':   { sig: 'MOBEXP xexpan, yexpan',        desc: 'Enables and disables X-expansion and Y-expansion of the current sprite.' },
  'MOBPAT':   { sig: 'MOBPAT shape#, bank',          desc: 'Moves the CODE pointer to point at the specified sprite\'s data. `shape#` is the shape, `bank` is where coded data will be sent.' },
  'MOBSET':   { sig: 'MOBSET shape#, number, number, number, ...', desc: 'Initialises a sprite from The Spreditor.' },
  'MOBXY':    { sig: 'MOBXY x, y, x-add, y-add',    desc: 'Moves the current sprite to coordinates (x, y). `x-add` and `y-add` set offsets.' },
  'SHAPE':    { sig: 'SHAPE byte[, byte[, ...]]',    desc: 'Changes the current sprite\'s shape. If more than 1 shape specified, sets shape for following sprites.' },

  // Interrupt Commands
  'HALTINT':  { sig: 'HALTINT',                      desc: 'Stops the interrupt totally, returning interrupts to normal. Critical to call before exiting your program.' },
  'INTEND':   { sig: 'INTEND flag',                  desc: 'Should be the last statement in your interrupt routine. If `flag` is 0, JMP to BASIC\'s hardware timer routine; 1 will RTI.' },
  'INTERRUPT':{ sig: 'INTERRUPT raster, line#',      desc: 'Creates a new raster interrupt at line `raster` (50-249) which calls the code at `line#`.' },
  'RASTER':   { sig: 'RASTER raster',                desc: 'Selects the next raster line to interrupt.' },
  'STARTINT': { sig: 'STARTINT',                     desc: 'Should be the first command in your interrupt routine.' },

  // Sound Commands
  'ADSR':     { sig: 'ADSR attack, decay, sustain, release', desc: 'Specifies the attack, decay, sustain and release parameters for the current VOICE. Call VOICE before this.' },
  'CUTOFF':   { sig: 'CUTOFF freq',                  desc: 'Sets the cutoff frequency for the SID filtering system.' },
  'FILTER':   { sig: 'FILTER voice1, voice2, voice3, ext, resonance', desc: 'Enables or disables filters for each voice, the external input, and the resonance value.' },
  'FREQ':     { sig: 'FREQ freq',                    desc: 'Specifies the frequency the current voice will play. Call VOICE before this.' },
  'PULSE':    { sig: 'PULSE width',                  desc: 'Specifies the pulse waveform width for the current voice. Call VOICE before this.' },
  'SIDCLR':   { sig: 'SIDCLR',                       desc: 'Clears all sound registers.' },
  'VOICE':    { sig: 'VOICE num',                    desc: 'Chooses which SID voice to use (1-3). Required before FREQ, PULSE, ADSR, and WAVE.' },
  'VOL':      { sig: 'VOL volume, low, band, high, disconnect', desc: 'Controls main volume and filter selection. Can enable/disable low, band and high pass filters. `disconnect` disconnects voice 3 output.' },
  'WAVE':     { sig: 'WAVE gate, wave, ring, sync, test', desc: 'Enables/disables the gate. `wave`: 1=triangle, 2=sawtooth, 4=pulse, 8=noise. `ring`/`sync` choose modulation. `test` enables/disables the oscillator. Call VOICE first.' },

  // Text Video Commands
  'BLANK':    { sig: 'BLANK [blank[, bg, bars1, bars2]]', desc: 'Blanks or restores the screen. 1 blanks, 0 un-blanks. `bg` changes background color (0-15). `bars` changes bar colors.' },
  'CATCH':    { sig: 'CATCH rasterline',             desc: 'Acts like a WAIT command for the rasterline. `rasterline` can be 0-255.' },
  'CHARPAT':  { sig: 'CHARPAT character, charset',  desc: 'Moves the "code" pointer to point at a specific character image in `charset`.' },
  'CHARSET':  { sig: 'CHARSET charset',              desc: 'Selects the desired character set.' },
  'COLORS':   { sig: 'COLORS text, border, screen, color1, color2, color3', desc: 'Sets the color registers.' },
  'COPYSET':  { sig: 'COPYSET charset[, case]',      desc: 'Copies the C64 character set to location `charset`. `case` 0 = uppercase, 1 = lowercase.' },
  'EXTENDED': { sig: 'EXTENDED on[, color1, color2, color3]', desc: 'Turns extended color mode on or off. If colors supplied, sets the 3 background colors.' },
  'LOWERCASE':{ sig: 'LOWERCASE [disable]',          desc: 'Changes the character set to lowercase. If `disable` is 1, disables keyboard toggling between upper and lower case.' },
  'MULTI':    { sig: 'MULTI on[, color1, color2]',   desc: 'Turns multicolor mode on or off. If colors specified, sets the background colors.' },
  'NORMAL':   { sig: 'NORMAL clear',                 desc: 'Resets the screen to normal text mode. 1 clears the line link table, 0 does not.' },
  'PANX':     { sig: 'PANX panvalue, columns',       desc: 'Pans the screen horizontally. `panvalue` (bit-reversed) 0-7 (0=none). `columns` 0=38 column, 1=40 column screen.' },
  'PANY':     { sig: 'PANY panvalue, rows',          desc: 'Pans the screen vertically. `panvalue` (bit-reversed) 0-7 (3=none). `rows` 0=24 row, 1=25 row screen.' },
  'UPPERCASE':{ sig: 'UPPERCASE [disable]',          desc: 'Changes the character set to uppercase. If `disable` is 1, disables keyboard toggling.' },
  'VIDLOC':   { sig: 'VIDLOC screen, printto, charset, clear', desc: 'Moves the text screen to one of 64 1K screens. `screen` chooses which 1K, `printto` chooses which to print to, `charset` selects charset location, `clear` 1 clears line link table.' },

  // Core BASIC Keywords
  'ASC':      { sig: 'ASC(string)',                  desc: 'Returns the ASCII value of `string`.' },
  'BUTTON':   { sig: 'BUTTON joynum[, button#]',    desc: 'Returns 1 if the joystick button is pressed, 0 if not. `button#` 1, 2 or 3, default is 1.' },
  'BYTES':    { sig: 'BYTES count[, byte[, tag[, alignment]]]', desc: 'When compiling, inserts `count` bytes of value `byte` (default 0), with label `tag`, aligned to `alignment`.' },
  'CHR$':     { sig: 'CHR$(vov[, count])',           desc: 'Appends ASCII character `vov` to a string, 1 or `count` times.' },
  'CLOCK':    { sig: 'CLOCK [jiffies]',              desc: 'Sets the CLOCK to `jiffies` if specified, or 0 if not.' },
  'CLOSE':    { sig: 'CLOSE file#, file#, ...',      desc: 'Closes 1 or more files.' },
  'CLS':      { sig: 'CLS [pokecode[, color]]',      desc: 'Clears the current text screen. Uses space if `pokecode` not specified. Colors not changed unless `color` specified.' },
  'CMD':      { sig: 'CMD file#[, string]',          desc: 'Redirects all I/O to file `file#`. Optionally sends `string` to the file.' },
  'COPY':     { sig: 'COPY start, end, new',         desc: 'Copies memory from addresses `start-end` to address `new`.' },
  'DATA':     { sig: 'DATA val, val, ...',           desc: 'Holds data to be READ later.' },
  'DEBUG':    { sig: 'DEBUG 0 | 1',                  desc: 'Enables (1) or disables (0) DEBUG mode. DEBUG reduces compilation passes — results in slower and larger programs.' },
  'DEF':      { sig: 'DEF type var[, var, ...]',     desc: 'Defines variable types in a structured fashion. `type` can be TAG, LABEL, INT, INTEGER or DECIMAL.' },
  'DETEXT':   { sig: 'DETEXT(type)',                 desc: 'Returns how much extended memory of `type` is attached to the system.' },
  'DO':       { sig: 'DO line#, times',              desc: 'Runs line `line#` exactly `times` times. Only works with integer variables.' },
  'DUP$':     { sig: 'DUP$(string, count)',          desc: 'Duplicates `string` exactly `count` times.' },
  'ELSE':     { sig: 'ELSE statement',               desc: 'If the prior IF expression evaluated to FALSE, `statement` will be executed.' },
  'END':      { sig: 'END',                          desc: 'Ends execution of the program and returns screen to normal.' },
  'FETCH':    { sig: 'FETCH count, destination, reu[, bank]', desc: 'Copies `count` bytes from attached REU at address `reu` in `bank` to C64 address `destination`.' },
  'FILL':     { sig: 'FILL start, end[, byte[, step]]', desc: 'Fills memory from address `start` to `end` with value `byte` (default 0), incrementing by `step` (default 1).' },
  'FOR':      { sig: 'FOR var = start TO end [STEP val]', desc: 'Defines a FOR loop. Only works with integer variables. Increment defaults to 1 unless STEP specified.' },
  'GET':      { sig: 'GET variable',                 desc: 'Reads a character and puts it in `variable`.' },
  'GOSUB':    { sig: 'GOSUB line#[, line#[, ...]]', desc: 'Runs a subroutine at `line#`. If more than 1 line# specified, runs each in order.' },
  'GOTO':     { sig: 'GOTO tag | line_number',       desc: 'Jumps to `line_number` or `tag` in the program.' },
  'HALT':     { sig: 'HALT',                         desc: 'Stops compilation at this point. All previous code will be compiled. Use RESUME to continue.' },
  'IF':       { sig: 'IF expression [AND | OR | EOR expression]', desc: 'Evaluates the expression and sets a flag acted upon when the program reaches a THEN statement.' },
  'INPUT':    { sig: 'INPUT var, var, ...',          desc: 'Reads lines and puts the values in `var`.' },
  'JOIN':     { sig: 'JOIN vop = low, high',         desc: 'Opposite of SPLIT. Joins low and high bytes into a single value.' },
  'JOY':      { sig: 'JOY(joynum)',                  desc: 'Returns the value of joystick port `joynum`. Typically 1 or 2.' },
  'KEYPRESS': { sig: 'KEYPRESS [vov[, vov]]',        desc: 'If `vov` not specified, waits for any keypress. Otherwise waits for `vov`. Second `vov` acts like an IF block (FALSE=first char, TRUE=second char).' },
  'LEFT$':    { sig: 'LEFT$(string, count)',          desc: 'Returns `count` characters from the left of `string`.' },
  'LEN':      { sig: 'LEN(string)',                  desc: 'Returns the length of `string`.' },
  'LOC':      { sig: 'LOC(x, y)',                    desc: 'Moves the cursor to location x, y on the current text screen.' },
  'MID$':     { sig: 'MID$(string, position, count)', desc: 'Returns `count` characters starting at index `position` from `string`.' },
  'MODULE':   { sig: 'MODULE filename[, devnum[, address]]', desc: 'When compiling, writes this section to a separate module file for reusability. Default address is 49152.' },
  'NEXT':     { sig: 'NEXT var[, var[, ...]]',       desc: 'The end of a FOR loop. `var` must match the corresponding FOR loop.' },
  'ON':       { sig: 'ON var GOSUB | GOTO line#, line#, ...', desc: 'Jumps to the `line#` that matches the value of `var`.' },
  'OPEN':     { sig: 'OPEN file#, dev#, secondary, string', desc: 'Opens a connection to device `dev#` assigned to file `file#` with secondary parameter and optional string.' },
  'PADBUT':   { sig: 'PADBUT joynum',               desc: 'Returns 1 if the paddle button is pressed, 0 if not.' },
  'PADDLE':   { sig: 'PADDLE joynum',               desc: 'Returns the value of the paddle (0-255). Paddles 1-2 are in joynum 1, 3-4 in 2. Returned values are bit-reversed. Use POKE 2383,0 to disable bit-reversing.' },
  'PAUSE':    { sig: 'PAUSE seconds[, jiffies]',     desc: 'Pauses execution for `seconds` seconds. Optional `jiffies` adds (jiffies/60) seconds.' },
  'PEEK':     { sig: 'PEEK(vov[, index])',           desc: 'Returns the memory at address `vov`, optionally offset by `index`.' },
  'POINT':    { sig: 'POINT vop = line#  |  POINT TAG tag = line#', desc: 'Sets `vop` to the address of the compiled code for `line#`. TAG form creates a tag pointing to that address.' },
  'POKE':     { sig: 'POKE address, vov, vov, ...',  desc: 'Puts values `vov` in consecutive memory starting at `address`. Can also be used with strings.' },
  'POLL':     { sig: 'POLL port#',                   desc: 'Tells the C64 which set of paddles you\'re polling. `port#` 1 = joystick port 1, 2 = port 2.' },
  'PRINT':    { sig: 'PRINT expression',             desc: 'Prints `expression` to the current text screen.' },
  'PROC':     { sig: 'PROC tag[. vop[, vop[, ...]]]', desc: 'Defines the start of a subroutine named `tag` with parameters `vop`. Call with tag.vop,vop syntax. Strings cannot be returned.' },
  'PASS':     { sig: 'PASS vop[, vop[, ...]]',       desc: 'Defines parameters for a subroutine. Must be the first command after PROC if passing parameters.' },
  'READ':     { sig: 'READ vop, vop, ...',           desc: 'Reads values from a DATA statement.' },
  'REM':      { sig: 'REM',                          desc: 'Turns the rest of the line into a comment.' },
  'RESTORE':  { sig: 'RESTORE [line#]',              desc: 'Resets the pointer to the start of all DATA statements, or to the DATA statement on `line#`.' },
  'RESUME':   { sig: 'RESUME',                       desc: 'Resumes compilation after a HALT. Must be at the beginning of a line or it will be ignored.' },
  'RETURN':   { sig: 'RETURN',                       desc: 'Ends a subroutine and sends program flow back to the GOSUB statement.' },
  'REUPEEK':  { sig: 'REUPEEK(address, bank)',       desc: 'Returns the value from an attached REU at `address` in `bank`.' },
  'REUPOKE':  { sig: 'REUPOKE address, bank, val, val, ...', desc: 'Writes values to an attached REU starting at `address` in `bank`.' },
  'RIGHT$':   { sig: 'RIGHT$(string, count)',         desc: 'Returns `count` characters from the right of `string`.' },
  'SEND':     { sig: 'SEND vov',                     desc: 'Makes the subroutine return the value `vov`. Must be the final command before RETURN. Strings cannot be returned.' },
  'SPC':      { sig: 'SPC(vov)',                     desc: 'Prints `vov` spaces.' },
  'SPLIT':    { sig: 'SPLIT low, high[, high2] = vov', desc: 'Splits a variable into low and high bytes.' },
  'STASH':    { sig: 'STASH count, address, reu[, bank]', desc: 'Copies `count` C64 memory bytes at `address` to attached REU address `reu` in `bank`.' },
  'STATUS':   { sig: 'STATUS',                       desc: 'Reads and clears the STatus register.' },
  'STOP':     { sig: 'STOP',                         desc: 'Stops program execution but does not reset the screen.' },
  'STR$':     { sig: 'STR$(vov)',                    desc: 'Converts number `vov` into a string.' },
  'STRINGS':  { sig: 'STRINGS [size]',               desc: 'With no parameter, stretches the string field to 53247, otherwise to `size`.' },
  'SWAP':     { sig: 'SWAP count, c64, reu[, bank]', desc: 'Swaps main memory at `c64` with REU memory at `reu` in `bank`.' },
  'SWITCH':   { sig: 'SWITCH start, end, start2',    desc: 'Swaps memory at addresses `start-end` with memory starting at `start2`.' },
  'SYS':      { sig: 'SYS address[, A, X, Y, ST]',  desc: 'Starts execution of ML code at `address`. A, X, Y, ST values loaded into registers if specified.' },
  'TAB':      { sig: 'TAB(vov)',                     desc: 'Moves the cursor to `vov` on the current line.' },
  'THEN':     { sig: 'THEN statement',               desc: 'If the prior IF expression evaluated to TRUE, `statement` will be executed.' },
  'TRAP':     { sig: 'TRAP line#[, vop]',            desc: 'Sends control to `line#` on error. `vop` if specified is a non-arrayed int that receives the address of the error.' },
  'VAL':      { sig: 'VAL(string)',                  desc: 'Returns the mathematical value of `string`.' },
  'VERSION':  { sig: 'VERSION number',               desc: 'Specifies which version of Vision BASIC is needed to compile the block of code.' },
  'WAIT':     { sig: 'WAIT address, and, eor',       desc: 'Waits for a non-0 result from PEEKing `address` and filtering with AND `and` and EOR `eor`.' },
  'START':    { sig: 'START [* =] address',          desc: 'Specifies the starting location for an ML program. Must be placed at the very beginning of your ML program and only used once.' },
};

// ─── Important notes shown as warnings in hover ───────────────────────────────
const MATH_WARNING = '\n\n> ⚠️ **No parentheses in math!** Expressions evaluate strictly left-to-right.\n> e.g. `A=3+4:A=A*4` not `A=4*(3+4)`';
const MATH_KEYWORDS = new Set(['ABS','INT','SGN','WHOLE','FRAC','RANDOM','RND','ADD','SUBTRACT','COMPARE','HALF','DOUBLE','INC','DEC']);
const VAR_NOTE = '\n\n> 📝 Variable names: max 8 chars, must start with a letter. Integers by default — use `DECIMAL` for floats. String vars end with `$`.';

function activate(context) {

  // ─── Hover Provider ─────────────────────────────────────────────────────────
  const hoverProvider = vscode.languages.registerHoverProvider(
    { language: 'visionbasic' },
    {
      provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, /[A-Za-z][A-Za-z0-9!@#%&?]{0,7}\$?/);
        if (!range) return null;

        const word = document.getText(range).toUpperCase();
        const doc = HOVER_DOCS[word];
        if (!doc) return null;

        let content = new vscode.MarkdownString();
        content.isTrusted = true;

        // Signature in code block
        content.appendCodeblock(doc.sig, 'visionbasic');
        // Description
        content.appendMarkdown(doc.desc);

        // Append contextual warnings
        if (MATH_KEYWORDS.has(word)) {
          content.appendMarkdown(MATH_WARNING);
        }
        if (word === 'DIM' || word === 'DECIMAL' || word === 'TAG' || word === 'VARIABLES') {
          content.appendMarkdown(VAR_NOTE);
        }
        if (word === 'VOICE') {
          content.appendMarkdown('\n\n> ⚠️ Must be called before FREQ, PULSE, ADSR, and WAVE.');
        }
        if (word === 'HALTINT') {
          content.appendMarkdown('\n\n> ⚠️ **Critical:** Always call HALTINT before exiting a program that uses interrupts.');
        }
        if (word === 'PROC' || word === 'SEND') {
          content.appendMarkdown('\n\n> ⚠️ Strings and string variables cannot be returned from subroutines.');
        }

        return new vscode.Hover(content, range);
      }
    }
  );

  // ─── Status Bar: show BASIC/ML mode indicator ────────────────────────────────
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'visionbasic.toggleCommentMode';

  let mlMode = false;

  function updateStatusBar() {
    statusBar.text = mlMode ? '$(circuit-board) VB: ML mode' : '$(code) VB: BASIC mode';
    statusBar.tooltip = mlMode
      ? 'Vision BASIC: ML comment mode (;) — click to switch'
      : 'Vision BASIC: BASIC comment mode (REM) — click to switch';
    statusBar.show();
  }

  // ─── Comment Mode Toggle Command ─────────────────────────────────────────────
  const toggleCmd = vscode.commands.registerCommand('visionbasic.toggleCommentMode', () => {
    mlMode = !mlMode;
    updateStatusBar();

    // Update the editor's comment config by notifying the user
    // (VSCode doesn't let extensions change commentString at runtime,
    //  but we show a hint and the status bar makes the mode clear)
    const modeLabel = mlMode ? 'ML mode (;)' : 'BASIC mode (REM)';
    vscode.window.showInformationMessage(`Vision BASIC: switched to ${modeLabel}`);
  });

  // Show status bar when a visionbasic file is active
  const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && editor.document.languageId === 'visionbasic') {
      updateStatusBar();
    } else {
      statusBar.hide();
    }
  });

  // Show immediately if already open
  if (vscode.window.activeTextEditor &&
      vscode.window.activeTextEditor.document.languageId === 'visionbasic') {
    updateStatusBar();
  }

  context.subscriptions.push(hoverProvider, toggleCmd, statusBar, editorChangeDisposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
