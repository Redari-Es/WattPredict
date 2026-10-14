package main

import (
	"log"
	"net/http"
	"os"

	"github.com/shonh/WattPredict/packages/wattengine/internal/handler"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8088" // 8080 常被本机 Apache/Nginx 占用
	}

	// 注意：不使用 "POST /api/simulate" 这类方法限定模式——
	// 部分定制 Go 工具链默认回退到 1.21 的 ServeMux 行为会导致 404。
	// 方法校验在各 handler 内完成。
	mux := http.NewServeMux()
	mux.HandleFunc("/api/simulate", handler.Simulate)
	mux.HandleFunc("/api/reconcile", handler.Reconcile)
	mux.HandleFunc("/healthz", handler.Health)

	log.Printf("wattengine listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
