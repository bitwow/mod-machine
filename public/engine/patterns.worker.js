// Extracts pattern data for the tracker view off the audio thread. The
// worklet only renders; this worker opens its own copy of the module and
// returns every pattern as packed bytes: rows × channels × 6 commands
// (note, instrument, volume effect, effect, volume, parameter).
import libopenmptPromise from './libopenmpt.worklet.js'

const COMMANDS = 6
const ready = libopenmptPromise()

self.onmessage = async ({ data: { id, buffer } }) => {
	let lib = null
	let filePtr = 0
	let modulePtr = 0
	try {
		lib = await ready
		const bytes = new Uint8Array(buffer)
		filePtr = lib._malloc(bytes.byteLength)
		lib.HEAPU8.set(bytes, filePtr)
		modulePtr = lib._openmpt_module_create_from_memory(filePtr, bytes.byteLength, 0, 0, 0)
		if (!modulePtr) throw new Error('not a module')

		const channels = lib._openmpt_module_get_num_channels(modulePtr)
		const patterns = []
		const transfer = []
		for (let pattern = 0, count = lib._openmpt_module_get_num_patterns(modulePtr); pattern < count; pattern++) {
			const rows = lib._openmpt_module_get_pattern_num_rows(modulePtr, pattern)
			const data = new Uint8Array(rows * channels * COMMANDS)
			let index = 0
			for (let row = 0; row < rows; row++) {
				for (let channel = 0; channel < channels; channel++) {
					for (let command = 0; command < COMMANDS; command++) {
						data[index++] = lib._openmpt_module_get_pattern_row_channel_command(modulePtr, pattern, row, channel, command)
					}
				}
			}
			patterns.push({ rows, data })
			transfer.push(data.buffer)
		}
		self.postMessage({ id, channels, patterns }, transfer)
	} catch (error) {
		self.postMessage({ id, error: String(error?.message ?? error) })
	} finally {
		if (filePtr) lib._free(filePtr)
		if (modulePtr) lib._openmpt_module_destroy(modulePtr)
	}
}
