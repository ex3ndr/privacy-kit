package main

import (
	"bufio"
	"encoding/json"
	"log"
	"os"
	"strings"
	"syscall"

	"github.com/mdlayher/vsock"
)

const (
	hostCID = uint32(3)
	port    = uint32(1025)
	path    = "/env"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatalf("usage: boot <command> [args...]")
	}

	// Open connection to host
	conn, err := vsock.Dial(hostCID, port, nil)
	if err != nil {
		log.Fatalf("dial vsock: %v", err)
	}
	defer conn.Close()

	// Simple HTTP GET with required Host header
	_, _ = conn.Write([]byte("GET " + path + " HTTP/1.1\r\nHost: localhost\r\n\r\n"))

	// Parse HTTP response
	reader := bufio.NewReader(conn)
	
	// Read status line
	statusLine, err := reader.ReadString('\n')
	if err != nil {
		log.Fatalf("reading status line: %v", err)
	}
	if !strings.Contains(statusLine, "200 OK") {
		log.Fatalf("unexpected response: %s", statusLine)
	}
	
	// Skip headers until we hit an empty line
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			log.Fatalf("reading headers: %v", err)
		}
		if line == "\r\n" {
			break
		}
	}
	
	// Now read the JSON body
	dec := json.NewDecoder(reader)
	var env map[string]string
	if err := dec.Decode(&env); err != nil {
		log.Fatalf("decode: %v", err)
	}

	for k, v := range env {
		os.Setenv(k, v)
		log.Printf("🌐 pulled %s=%s", k, v)
	}

	// Start daemon
	cmd := "/proxy/nitriding-daemon"
	args:= []string{
		cmd, // First argument must be the program name
		"-fqdn", "localhost",
		"-extport", "8443",
		"-intport", "8081",
		"-appwebsrv", "http://localhost:8080",
		"-appcmd", strings.Join(os.Args[1:], " "),
	}
	log.Printf("🌐 launching %s %s", cmd, strings.Join(args[1:], " "))
	if err := syscall.Exec(cmd, args, os.Environ()); err != nil {
		log.Fatalf("exec: %v", err)
	}
}
