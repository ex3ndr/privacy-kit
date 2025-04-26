package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/mdlayher/vsock" // MIT-licensed, tiny dependency
)

// change with -port= if you need a different one
const port = uint32(1025) // enclave will dial (cid 3, port 1025)

func main() {
	// Process environment variables once at startup
	env := map[string]string{}
	prefix := "ENCLAVE_"
	for _, kv := range os.Environ() {
		if i := strings.IndexByte(kv, '='); i > 0 {
			key := kv[:i]
			val := kv[i+1:]
			
			// Only include env vars with ENCLAVE_ prefix
			if len(key) > len(prefix) && key[:len(prefix)] == prefix {
				// Remove the prefix when adding to map
				env[key[len(prefix):]] = val
			}
		}
	}
	
	ln, err := vsock.Listen(vsock.Host, port) // Host CID == 3
	if err != nil {
		log.Fatalf("vsock listen: %v", err)
	}
	http.HandleFunc("/env", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(env)
	})
	log.Printf("🏠 envserver listening on vsock:(cid=3,port=%d)", port)
	log.Fatal(http.Serve(ln, nil))
}