param (
    [string]$windowName
)

Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    using System.Text;

    public class Win32 {
        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    }
"@

function Get-NormalizedWindowTitle($title) {
    return $title.Trim() -replace '\s+', ' '
}

$normalizedWindowName = Get-NormalizedWindowTitle $windowName
$hWnd = [Win32]::FindWindow($null, $normalizedWindowName)

if ($hWnd -eq [IntPtr]::Zero) {
    [Win32]::EnumWindows({
        param($hWnd, $lParam)
        $title = New-Object Text.StringBuilder 256
        if ([Win32]::GetWindowText($hWnd, $title, $title.Capacity) -gt 0) {
            $currentTitle = Get-NormalizedWindowTitle $title.ToString()
            if ($currentTitle -eq $normalizedWindowName) {
                $script:hWnd = $hWnd
                return $false  # Stop enumerating windows
            }
        }
        $true  # Continue enumerating windows
    }, [IntPtr]::Zero) | Out-Null
}

if ($script:hWnd -ne [IntPtr]::Zero) {
    [Win32]::SetWindowPos($script:hWnd, [IntPtr]::Zero, 0, 0, 800, 800, 0x0040) # SWP_NOMOVE | SWP_NOSIZE
    [Win32]::SetForegroundWindow($script:hWnd)
    [Win32]::ShowWindow($script:hWnd, 1) # SW_SHOWNORMAL
    Write-Output "Window '$windowName' moved and focused successfully."
} else {
    Write-Output "Window '$windowName' not found. Available windows:"
    $windowTitles = New-Object System.Collections.ArrayList
    [Win32]::EnumWindows({
        param($hWnd, $lParam)
        $title = New-Object Text.StringBuilder 256
        if ([Win32]::GetWindowText($hWnd, $title, $title.Capacity) -gt 0) {
            $windowTitles.Add($title.ToString()) | Out-Null
        }
        $true
    }, [IntPtr]::Zero) | Out-Null
    $windowTitles
}
