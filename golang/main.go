package main

import (
	"io"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/stream/", func(w http.ResponseWriter, r *http.Request) {
		// Lấy đường dẫn cần fetch từ URL
		urlPath := r.URL.Path[len("/stream/"):]

		// Tạo HTTP request tới server đích
		client := &http.Client{}
		req, err := http.NewRequest("GET", "https://"+urlPath, nil)
		if err != nil {
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}

		// Thiết lập User-Agent
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36")

		// Gửi request và nhận phản hồi
		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, "Failed to fetch data", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// Truyền nội dung từ phản hồi tới client
		w.Header().Set("Content-Type", "application/octet-stream")
		w.WriteHeader(http.StatusOK)
		io.Copy(w, resp.Body)
	})

	port := ":3000"
	log.Printf("Server running at http://0.0.0.0%s/", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
