// Shared flag so passive step reconciliation can pause itself while a Track
// session is in progress — those steps will be credited (accurately, via
// GPS) by the session's own Save instead. Without this, the same steps
// would be double-counted: once by the in-progress session, once by the
// next passive reconciliation pass.
let recordingInProgress = false;

export function setRecordingInProgress(value: boolean) {
  recordingInProgress = value;
}

export function isRecordingInProgress(): boolean {
  return recordingInProgress;
}
