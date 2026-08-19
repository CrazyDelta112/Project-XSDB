using System.Runtime.InteropServices;


namespace XboxDashboard.Services;

public sealed class ControllerService : IDisposable
{
    private const ushort DpadUp = 0x0001;
    private const ushort DpadDown = 0x0002;
    private const ushort DpadLeft = 0x0004;
    private const ushort DpadRight = 0x0008;
    private const ushort StartButton = 0x0010;
    private const ushort BackButton = 0x0020;
    private const ushort LeftThumb = 0x0040;
    private const ushort RightThumb = 0x0080;
    private const ushort LeftShoulder = 0x0100;
    private const ushort RightShoulder = 0x0200;

    // Best-effort Guide bit exposed by XInputGetStateEx when available.
    private const ushort Guide = 0x0400;

    private const ushort A = 0x1000;
    private const ushort B = 0x2000;
    private const ushort X = 0x4000;
    private const ushort Y = 0x8000;

    [StructLayout(LayoutKind.Sequential)]
    private struct XInputState
    {
        public uint PacketNumber;
        public XInputGamepad Gamepad;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct XInputGamepad
    {
        public ushort Buttons;
        public byte LeftTrigger;
        public byte RightTrigger;
        public short LeftX;
        public short LeftY;
        public short RightX;
        public short RightY;
    }

    [UnmanagedFunctionPointer(CallingConvention.Winapi)]
    private delegate uint XInputGetStateExDelegate(
        uint userIndex,
        out XInputState state);

    [DllImport("xinput1_4.dll", EntryPoint = "XInputGetState")]
    private static extern uint XInputGetState(
        uint userIndex,
        out XInputState state);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr LoadLibrary(string fileName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GetProcAddress(
        IntPtr module,
        IntPtr ordinal);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool FreeLibrary(IntPtr module);

    private readonly object _sync = new();
    private readonly Dictionary<string, DateTime> _repeatTimes = new();

    private CancellationTokenSource? _cts;
    private Task? _loop;
    private ushort _previousButtons;
    private bool _leftTriggerDown;
    private bool _rightTriggerDown;
    private bool _connected;
    private IntPtr _xInputModule;
    private XInputGetStateExDelegate? _getStateEx;

    public int Deadzone { get; set; } = 16000;
    public int RepeatMilliseconds { get; set; } = 125;
    public int InitialRepeatDelayMilliseconds { get; set; } = 300;

    public event Action<string>? ButtonPressed;
    public event Action<bool>? ConnectionChanged;

    public bool IsRunning => _loop is { IsCompleted: false };
    public bool IsConnected => _connected;

    public ControllerService()
    {
        TryLoadExtendedXInput();
    }

    public void Start()
    {
        lock (_sync)
        {
            if (IsRunning)
                return;

            _cts = new CancellationTokenSource();
            _loop = Task.Run(() => PollLoopAsync(_cts.Token));
        }
    }

    private async Task PollLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            XInputState state;
            uint result = GetState(0, out state);
            bool connectedNow = result == 0;

            UpdateConnection(connectedNow);

            if (connectedNow)
            {
                ushort current = state.Gamepad.Buttons;

                CheckButton(current, A, "A");
                CheckButton(current, B, "B");
                CheckButton(current, X, "X");
                CheckButton(current, Y, "Y");
                CheckButton(current, StartButton, "START");
                CheckButton(current, BackButton, "BACK");
                CheckButton(current, LeftShoulder, "LB");
                CheckButton(current, RightShoulder, "RB");
                CheckButton(current, LeftThumb, "LSTICK");
                CheckButton(current, RightThumb, "RSTICK");
                CheckButton(current, Guide, "GUIDE");

                CheckRepeatButton(current, DpadUp, "UP");
                CheckRepeatButton(current, DpadDown, "DOWN");
                CheckRepeatButton(current, DpadLeft, "LEFT");
                CheckRepeatButton(current, DpadRight, "RIGHT");

                CheckAnalogDirections(
                    state.Gamepad.LeftX,
                    state.Gamepad.LeftY);

                CheckTriggers(
                    state.Gamepad.LeftTrigger,
                    state.Gamepad.RightTrigger);

                _previousButtons = current;
            }
            else
            {
                ResetInputState();
            }

            try
            {
                await Task.Delay(16, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private void UpdateConnection(bool connected)
    {
        if (_connected == connected)
            return;

        _connected = connected;
        ConnectionChanged?.Invoke(connected);
    }

    private uint GetState(uint index, out XInputState state)
    {
        if (_getStateEx is not null)
        {
            try
            {
                return _getStateEx(index, out state);
            }
            catch
            {
                _getStateEx = null;
            }
        }

        return XInputGetState(index, out state);
    }

    private void CheckButton(
        ushort current,
        ushort mask,
        string name)
    {
        bool pressed = (current & mask) != 0;
        bool wasPressed = (_previousButtons & mask) != 0;

        if (pressed && !wasPressed)
            ButtonPressed?.Invoke(name);
    }

    private void CheckRepeatButton(
        ushort current,
        ushort mask,
        string name)
    {
        bool pressed = (current & mask) != 0;
        bool wasPressed = (_previousButtons & mask) != 0;

        if (!pressed)
        {
            _repeatTimes.Remove(name);
            return;
        }

        DateTime now = DateTime.UtcNow;

        if (!wasPressed)
        {
            ButtonPressed?.Invoke(name);
            _repeatTimes[name] = now.AddMilliseconds(
                InitialRepeatDelayMilliseconds);
            return;
        }

        if (_repeatTimes.TryGetValue(name, out DateTime next) &&
            now >= next)
        {
            ButtonPressed?.Invoke(name);
            _repeatTimes[name] = now.AddMilliseconds(
                Math.Clamp(RepeatMilliseconds, 70, 350));
        }
    }

    private void CheckAnalogDirections(short x, short y)
    {
        int deadzone = Math.Clamp(Deadzone, 6000, 30000);
        string? direction = null;

        if (Math.Abs(x) > Math.Abs(y))
        {
            if (x > deadzone)
                direction = "STICK_RIGHT";
            else if (x < -deadzone)
                direction = "STICK_LEFT";
        }
        else
        {
            if (y > deadzone)
                direction = "STICK_UP";
            else if (y < -deadzone)
                direction = "STICK_DOWN";
        }

        string[] keys =
        [
            "STICK_UP",
            "STICK_DOWN",
            "STICK_LEFT",
            "STICK_RIGHT"
        ];

        foreach (string key in keys)
        {
            if (key != direction)
                _repeatTimes.Remove(key);
        }

        if (direction is null)
            return;

        DateTime now = DateTime.UtcNow;

        if (!_repeatTimes.TryGetValue(direction, out DateTime next))
        {
            ButtonPressed?.Invoke(
                direction.Replace("STICK_", ""));

            _repeatTimes[direction] = now.AddMilliseconds(
                InitialRepeatDelayMilliseconds);
        }
        else if (now >= next)
        {
            ButtonPressed?.Invoke(
                direction.Replace("STICK_", ""));

            _repeatTimes[direction] = now.AddMilliseconds(
                Math.Clamp(RepeatMilliseconds, 70, 350));
        }
    }

    private void CheckTriggers(byte leftTrigger, byte rightTrigger)
    {
        bool leftDown = leftTrigger >= 180;
        bool rightDown = rightTrigger >= 180;

        if (leftDown && !_leftTriggerDown)
            ButtonPressed?.Invoke("LT");

        if (rightDown && !_rightTriggerDown)
            ButtonPressed?.Invoke("RT");

        _leftTriggerDown = leftDown;
        _rightTriggerDown = rightDown;
    }

    private void TryLoadExtendedXInput()
    {
        try
        {
            _xInputModule = LoadLibrary("xinput1_4.dll");

            if (_xInputModule == IntPtr.Zero)
                return;

            IntPtr address = GetProcAddress(
                _xInputModule,
                (IntPtr)100);

            if (address == IntPtr.Zero)
                return;

            _getStateEx =
                Marshal.GetDelegateForFunctionPointer<XInputGetStateExDelegate>(
                    address);
        }
        catch
        {
            _getStateEx = null;
        }
    }

    private void ResetInputState()
    {
        _previousButtons = 0;
        _leftTriggerDown = false;
        _rightTriggerDown = false;
        _repeatTimes.Clear();
    }

    public void Stop()
    {
        lock (_sync)
        {
            _cts?.Cancel();
            _cts?.Dispose();
            _cts = null;
            _loop = null;
            ResetInputState();
            UpdateConnection(false);
        }
    }

    public void Dispose()
    {
        Stop();

        if (_xInputModule != IntPtr.Zero)
        {
            try
            {
                FreeLibrary(_xInputModule);
            }
            catch
            {
            }

            _xInputModule = IntPtr.Zero;
            _getStateEx = null;
        }
    }
}
