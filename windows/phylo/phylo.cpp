// phylo.cpp : Defines the entry point for the console application.
//
#include "stdafx.h"

static void puts (const wchar_t * text) {
	DWORD out;
	WriteConsole(GetStdHandle(STD_OUTPUT_HANDLE), text, lstrlen(text), &out, NULL);
}

int main (const wchar_t * arg) {
	puts(L"Hello ");
	puts(arg);
	puts(L"\n");

    return 0;
}

//---------------------------------------------------------------

void * __cdecl operator new (unsigned int bytes) {
	return HeapAlloc(GetProcessHeap(), 0, bytes);
}

void __cdecl operator delete (void *ptr) {
	if (ptr) HeapFree(GetProcessHeap(), 0, ptr);
}

extern "C" int __cdecl __purecall(void) {
	return 0;
}

int __cdecl mainCRTStartup () {
	ExitProcess(main(GetCommandLine()));
}
