import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Set up PDF.js worker - use a working version
if (typeof window !== 'undefined') {
  // Try multiple worker sources for better compatibility
  const workerSources = [
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
  ];
  
  pdfjs.GlobalWorkerOptions.workerSrc = workerSources[0];
  
  console.log('PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc);
  console.log('PDF.js version:', pdfjs.version);
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

  // Early return if no fileUrl
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No PDF URL provided</p>
      </div>
    );
  }

  // Debug logging
  console.log('📄 PDFViewer: Loading PDF from URL:', fileUrl);
  console.log('🔄 PDFViewer: Component state - loading:', loading, 'error:', error, 'numPages:', numPages);

  // Test if the Document component can load at all
  useEffect(() => {
    console.log('📝 PDFViewer: Component mounted with fileUrl:', fileUrl);
    console.log('📝 PDFViewer: Initial loading state:', loading);
    
    // Reset state when fileUrl changes
    setLoading(true);
    setError(null);
    setNumPages(0);
    setPageNumber(initialPage || 1);
    
    // Force start loading after a brief delay to ensure everything is ready
    const timer = setTimeout(() => {
      console.log('🚀 PDFViewer: Starting PDF load process...');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [fileUrl, initialPage]);

  // Test PDF URL accessibility and worker
  useEffect(() => {
    const testPDFUrl = async () => {
      try {
        console.log('Testing PDF URL accessibility...');
        // Use GET request with range to test accessibility without downloading full file
        const response = await fetch(fileUrl, { 
          method: 'GET',
          headers: { 'Range': 'bytes=0-1023' }
        });
        const testResult = {
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          acceptRanges: response.headers.get('accept-ranges')
        };
        console.log('PDF URL test result:', testResult);
        
        // If the URL is accessible, log success
        if (response.status === 200 && response.headers.get('content-type')?.includes('application/pdf')) {
          console.log('✅ PDF URL is accessible and valid');
        } else {
          console.warn('⚠️ PDF URL may have issues:', testResult);
        }
      } catch (error) {
        console.error('PDF URL test failed:', error);
      }
    };

    const testWorker = async () => {
      const workerSources = [
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
      ];
      
      for (let i = 0; i < workerSources.length; i++) {
        try {
          console.log(`Testing PDF.js worker ${i + 1}/${workerSources.length}:`, workerSources[i]);
          const response = await fetch(workerSources[i], { method: 'HEAD' });
          if (response.status === 200) {
            console.log('✅ Worker is accessible at:', workerSources[i]);
            pdfjs.GlobalWorkerOptions.workerSrc = workerSources[i];
            return;
          } else {
            console.warn(`⚠️ Worker ${i + 1} returned status:`, response.status);
          }
        } catch (error) {
          console.error(`❌ Worker ${i + 1} test failed:`, error);
        }
      }
      
      console.error('❌ All worker sources failed. PDF loading may not work properly.');
    };

    if (fileUrl) {
      testPDFUrl();
      testWorker();
    }
  }, [fileUrl]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⏰ PDFViewer: Loading timeout after 15 seconds');
        console.warn('This usually means the PDF.js worker is not loading properly or the PDF file is corrupted');
        setError('PDF loading timeout. The file may be too large, corrupted, or there may be a network issue. Try opening the PDF in a new tab.');
        setLoading(false);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Debug loading state changes
  useEffect(() => {
    console.log('🔄 PDFViewer: Loading state changed to:', loading);
  }, [loading]);

  useEffect(() => {
    console.log('⚠️ PDFViewer: Error state changed to:', error);
  }, [error]);

  useEffect(() => {
    console.log('📊 PDFViewer: NumPages changed to:', numPages);
  }, [numPages]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('🎉 PDFViewer: Document loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('❌ PDF load error:', error);
    console.error('📄 PDF URL:', fileUrl);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
    toast({
      title: "PDF Load Error",
      description: `Failed to load the PDF document: ${error.message}`,
      variant: "destructive",
    });
  }, [toast, fileUrl]);

  const onSourceSuccess = useCallback(() => {
    console.log('📥 PDF source loaded successfully');
    // Don't set loading to false here, wait for document load
  }, []);

  const onSourceError = useCallback((error: Error) => {
    console.error('❌ PDF source error:', error);
    setError(`PDF source error: ${error.message}`);
    setLoading(false);
  }, []);

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
              
              {/* Hidden Document component to trigger loading */}
              <div style={{ opacity: 0, position: 'absolute', left: '-9999px' }}>
                <Document
                  file={fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  onSourceSuccess={onSourceSuccess}
                  onSourceError={onSourceError}
                  onLoadProgress={(progress) => {
                    if (progress.total > 0) {
                      console.log('📈 PDF load progress:', Math.round(progress.loaded / progress.total * 100) + '%');
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
            onSourceSuccess={onSourceSuccess}
            onSourceError={onSourceError}
            onLoadProgress={(progress) => {
              if (progress.total > 0) {
                console.log('📈 PDF load progress:', Math.round(progress.loaded / progress.total * 100) + '%');
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
                onLoadSuccess={() => console.log('🎉 Page loaded successfully:', pageNumber)}
                onLoadError={(error) => console.error('❌ Page load error:', error)}
                onRenderSuccess={() => console.log('✨ Page rendered successfully:', pageNumber)}
                onRenderError={(error) => console.error('❌ Page render error:', error)}
              />
            )}
          </Document>
        </div>
      </ScrollArea>
    </div>
  );
}
