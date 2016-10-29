// phylo.cpp : Defines the entry point for the console application.
//
#include "stdafx.h"

static void puts (const wchar_t * text) {
	DWORD out;
	WriteConsole(GetStdHandle(STD_OUTPUT_HANDLE), text, lstrlen(text), &out, NULL);
}

#define WINDOWS_TICK 10000000
#define SEC_TO_UNIX_EPOCH 11644473600LL

unsigned FileTimeToPOSIX(FILETIME ft) {
	ULARGE_INTEGER i;
	i.HighPart = ft.dwHighDateTime;
	i.LowPart = ft.dwLowDateTime;
	return (unsigned)(i.QuadPart / WINDOWS_TICK - SEC_TO_UNIX_EPOCH);
}

wchar_t buf[2048];
const int CCH = sizeof buf / sizeof buf[0];

void clear(void * buffer, int n) {
	char * pb = (char *)buffer;

	for (int i = 0; i < n; ++i) {
		*pb++ = 0;
	}
}

#define ZERO(obj) clear(&obj, sizeof obj)

void printFile(const WIN32_FIND_DATA & data) {
	wchar_t attribs[16];
	DWORD fa = data.dwFileAttributes;
	ULARGE_INTEGER size;
	int i = 0;

	size.HighPart = data.nFileSizeHigh;
	size.LowPart = data.nFileSizeLow;

	if (lstrcmpi(data.cFileName, L".") == 0) {
		return;
	}
	if (lstrcmpi(data.cFileName, L"..") == 0) {
		return;
	}

	/*
	#define FILE_ATTRIBUTE_READONLY             0x00000001
	#define FILE_ATTRIBUTE_HIDDEN               0x00000002
	#define FILE_ATTRIBUTE_SYSTEM               0x00000004
	#define FILE_ATTRIBUTE_DIRECTORY            0x00000010
	#define FILE_ATTRIBUTE_ARCHIVE              0x00000020
	#define FILE_ATTRIBUTE_DEVICE               0x00000040
	#define FILE_ATTRIBUTE_NORMAL               0x00000080
	#define FILE_ATTRIBUTE_TEMPORARY            0x00000100
	#define FILE_ATTRIBUTE_SPARSE_FILE          0x00000200
	#define FILE_ATTRIBUTE_REPARSE_POINT        0x00000400
	#define FILE_ATTRIBUTE_COMPRESSED           0x00000800
	#define FILE_ATTRIBUTE_OFFLINE              0x00001000
	#define FILE_ATTRIBUTE_NOT_CONTENT_INDEXED  0x00002000
	#define FILE_ATTRIBUTE_ENCRYPTED            0x00004000
	#define FILE_ATTRIBUTE_INTEGRITY_STREAM     0x00008000
	#define FILE_ATTRIBUTE_VIRTUAL              0x00010000
	#define FILE_ATTRIBUTE_NO_SCRUB_DATA        0x00020000
	#define FILE_ATTRIBUTE_EA                   0x00040000
	*/
	if (fa & FILE_ATTRIBUTE_DIRECTORY) {
		attribs[i++] = 'D';
	}
	if (fa & FILE_ATTRIBUTE_READONLY) {
		attribs[i++] = 'R';
	}
	if (fa & FILE_ATTRIBUTE_HIDDEN) {
		attribs[i++] = 'H';
	}
	if (fa & FILE_ATTRIBUTE_SYSTEM) {
		attribs[i++] = 'S';
	}
	if (fa & FILE_ATTRIBUTE_ARCHIVE) {
		attribs[i++] = 'A';
	}
	if (fa & FILE_ATTRIBUTE_COMPRESSED) {
		attribs[i++] = 'C';
	}
	if (fa & FILE_ATTRIBUTE_ENCRYPTED) {
		attribs[i++] = 'E';
	}

	attribs[i] = 0;

	int n = wnsprintf(buf, CCH - 1, L"%s/%d/%d/%d/%lld/%ls\n",
		attribs,
		FileTimeToPOSIX(data.ftCreationTime),
		FileTimeToPOSIX(data.ftLastAccessTime),
		FileTimeToPOSIX(data.ftLastWriteTime),
		size.QuadPart,
		data.cFileName);

	buf[n] = 0;

	puts(buf);
}

int dir (const wchar_t * path) {
	WIN32_FIND_DATA data;
	HANDLE find;

	ZERO(data);
	find = FindFirstFile(path, &data);

	if (!find || find == INVALID_HANDLE_VALUE) {
		int n = wnsprintf(buf, CCH - 1, L"Failed to read \"%ls\" (%d)\n", path, GetLastError());
		buf[n] = 0;
		puts(buf);
		return 2;
	}

	do {
		printFile(data);

	} while (FindNextFile(find, &data));

	FindClose(find);
	return 0;
}

int run (int argc, const wchar_t * const * argv) {
	if (argc != 3) {
		puts(L"Expected 2 arguments: operation arg\n");
		return 1;
	}

	if (lstrcmp(L"dir", argv[1]) == 0) {
		return dir(argv[2]);
	}

	puts(L"Unknown operation. Should be \"dir\".\n");
    return 0;
}

//---------------------------------------------------------------

void * __cdecl operator new (unsigned int bytes) {
	return HeapAlloc(GetProcessHeap(), 0, bytes);
}

void __cdecl operator delete (void *ptr) {
	if (ptr) {
		HeapFree(GetProcessHeap(), 0, ptr);
	}
}

extern "C" int __cdecl __purecall(void) {
	return 0;
}

int __cdecl startup () {
	int argc;

	const wchar_t * const * argv = CommandLineToArgvW(GetCommandLineW(), &argc);
	int exitCode = run(argc, argv);

	ExitProcess(exitCode);
}
