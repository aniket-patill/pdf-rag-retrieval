import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
if (typeof window !== 'undefined') {
  const workerSources = [
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
  ];
  
  pdfjs.GlobalWorkerOptions.workerSrc = workerSources[0];
}

interface PDFViewerProps {
  fileUrl: string;
  title: string;
  initialPage?: number;
}

export function PDFViewer({ fileUrl, title, initialPage }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage || 1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No PDF URL provided</p>
      </div>
    );
  }
  useEffect(() => {
    setLoading(true);
    setError(null);
    setNumPages(0);
    setPageNumber(initialPage || 1);
  }, [fileUrl, initialPage]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setError('PDF loading timeout. The file may be too large, corrupted, or there may be a network issue. Try opening the PDF in a new tab.');
        setLoading(false);
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
    toast({
      title: "PDF Load Error",
      description: `Failed to load the PDF document: ${error.message}`,
      variant: "destructive",
    });
  }, [toast, fileUrl]);

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  if (loading && numPages === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* PDF Controls */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate max-w-xs">{title}</h3>
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>

        {/* PDF Content with Document component always rendered */}
        <ScrollArea className="flex-1">
          <div className="flex justify-center p-4">
            <div className="w-full max-w-4xl">
              <div className="flex items-center justify-center h-96 mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground ml-4">Loading PDF...</p>
              </div>
              <div style={{ opacity: 0, position: 'absolute', left: '-9999px' }}>
                <Document
                  file={fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  onLoadProgress={(progress) => {
                    if (progress.total > 0) {
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <p className="text-destructive mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(fileUrl, '_blank')}
            >
              Open PDF in New Tab
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate max-w-xs">{title}</h3>
          <span className="text-sm text-muted-foreground">
            Page {pageNumber} of {numPages}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="outline" size="icon" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Rotate */}
          <Button variant="outline" size="icon" onClick={rotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <ScrollArea className="flex-1">
        <div className="flex justify-center p-4">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadProgress={(progress) => {
              if (progress.total > 0) {
              }
            }}
          >
            {numPages > 0 && (
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
              />
            )}
          </Document>
        </div>
      </ScrollArea>
    </div>
  );
}
