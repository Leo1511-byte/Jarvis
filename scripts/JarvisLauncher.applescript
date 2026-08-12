-- Source for the double-clickable Desktop launcher (see
-- docs/DESKTOP_LAUNCHER.md). Compiled to an .app with osacompile, not run
-- directly. Backgrounds launch-jarvis.sh with `&` and returns immediately
-- so no Terminal window appears and this tiny app doesn't stay open.
do shell script "nohup /Users/leonardo/Developer/jarvis/scripts/launch-jarvis.sh > /tmp/jarvis-launch-wrapper.log 2>&1 &"
