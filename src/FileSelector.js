import React from 'react';
import { Button, Canvas, TextField, Spinner } from 'datocms-react-ui';

export default function FileSelector({ ctx }) {
  const token = ctx.plugin.attributes.parameters?.hubspotAccessToken;
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [allFiles, setAllFiles] = React.useState([]); // Store all loaded PDFs
  const [filteredFiles, setFilteredFiles] = React.useState([]); // Store filtered results
  const [error, setError] = React.useState(null);
  const [loadingProgress, setLoadingProgress] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState(null); // Store selected file
  const [currentPage, setCurrentPage] = React.useState(1);
  const filesPerPage = 25;
  const hasInitialized = React.useRef(false);

  // Load PDFs on component mount (check cache first) - only run once
  React.useEffect(() => {
    if (token && !hasInitialized.current) {
      hasInitialized.current = true;
      loadPDFsWithCache();
    }
  }, [token]);

  const getCacheKey = () => `hubspot-pdfs-${token?.substring(0, 8)}`; // Use part of token as cache key
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  const loadPDFsWithCache = () => {
    const cacheKey = getCacheKey();
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid (less than 24 hours old)
        if (now - timestamp < CACHE_DURATION) {
          console.log('Loading PDFs from cache (age:', Math.round((now - timestamp) / (60 * 60 * 1000)), 'hours)');
          setAllFiles(data);
          setFilteredFiles(data);
          console.log(`Loaded ${data.length} PDFs from cache. Last updated ${new Date(timestamp).toLocaleTimeString()}`);
          return;
        } else {
          console.log('Cache expired, refreshing...');
          localStorage.removeItem(cacheKey);
        }
      } catch (e) {
        console.error('Cache parse error:', e);
        localStorage.removeItem(cacheKey);
      }
    }
    
    // No valid cache, load fresh data
    loadAllPDFs();
  };

  // Filter files when query changes
  React.useEffect(() => {
    if (allFiles.length > 0) {
      filterFiles();
      findSelectedFileFromURL();
    }
  }, [query, allFiles]);

  // Find the selected file based on the current field URL value
  const findSelectedFileFromURL = () => {
    const currentURL = ctx.formValues[ctx.fieldPath];
    if (!currentURL || !allFiles.length) {
      setSelectedFile(null);
      return;
    }

    // Try to find matching file by URL (both encoded and decoded versions)
    const matchedFile = allFiles.find(file => {
      const cleanFileUrl = decodeURIComponent(file.url);
      const cleanCurrentUrl = decodeURIComponent(currentURL);
      
      return file.url === currentURL || 
             cleanFileUrl === currentURL || 
             file.url === cleanCurrentUrl ||
             cleanFileUrl === cleanCurrentUrl;
    });

    if (matchedFile) {
      setSelectedFile(matchedFile);
      console.log('Found matching file for URL:', matchedFile.name);
    } else {
      setSelectedFile(null);
      console.log('No matching file found for URL:', currentURL);
    }
  };

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  // Watch for changes in the field value and update selected file accordingly
  React.useEffect(() => {
    if (allFiles.length > 0) {
      findSelectedFileFromURL();
    }
  }, [ctx.formValues[ctx.fieldPath], allFiles]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredFiles.length / filesPerPage);
  const startIndex = (currentPage - 1) * filesPerPage;
  const endIndex = startIndex + filesPerPage;
  const currentPageFiles = filteredFiles.slice(startIndex, endIndex);

  const loadAllPDFs = async () => {
    setLoading(true);
    setError(null);
    setLoadingProgress('Loading all PDFs...');

    try {
      const params = new URLSearchParams();
      params.set('limit', '1000'); // Load up to 1000 PDFs
      params.set('token', token); // Pass the HubSpot token from plugin config
      
      const url = `/api/hubspot-search?${params.toString()}`;
      console.log('Loading ALL PDFs from proxy:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Loaded', data.results?.length || 0, 'total PDFs');

      const fileResults = (data.results || []).map(file => ({
        id: file.id,
        name: file.name || 'Unnamed',
        url: file.url || file.defaultHostingUrl || '',
        size: file.size || 0,
        path: file.path || '',
        createdAt: file.createdAt || '',
      }));

      setAllFiles(fileResults);
      setFilteredFiles(fileResults); // Initially show all
      
      // Cache the results
      const cacheKey = getCacheKey();
      const cacheData = {
        data: fileResults,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      console.log(`Loaded ${fileResults.length} PDFs and cached for 24 hours.`);

    } catch (err) {
      console.error('Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingProgress('');
    }
  };

  const filterFiles = () => {
    if (!query.trim()) {
      setFilteredFiles(allFiles);
      return;
    }

    const searchTerm = query.trim().toLowerCase();
    const filtered = allFiles.filter(file => 
      file.name.toLowerCase().includes(searchTerm) ||
      file.path.toLowerCase().includes(searchTerm)
    );
    
    setFilteredFiles(filtered);
    console.log(`Filtered to ${filtered.length} files matching "${query}"`);
  };

  const forceRefresh = () => {
    const cacheKey = getCacheKey();
    localStorage.removeItem(cacheKey);
    setAllFiles([]);
    setFilteredFiles([]);
    loadAllPDFs();
  };

  const selectFile = (file) => {
    // Clean up the URL by decoding it
    const cleanUrl = decodeURIComponent(file.url);
    
    // Store the clean URL in the field
    console.log('Setting field value:', {
      fieldPath: ctx.fieldPath,
      originalUrl: file.url,
      cleanUrl: cleanUrl,
      fieldType: ctx.field.attributes.field_type
    });
    
    ctx.setFieldValue(ctx.fieldPath, cleanUrl);
    setSelectedFile(file); // Store selected file for display
    console.log('Selected file state set to:', file.name);
    ctx.notice(`Selected: ${file.name}`);
    
    // Log the field value after setting to verify
    setTimeout(() => {
      console.log('Field value after setting:', ctx.formValues[ctx.fieldPath]);
    }, 100);
    
    // Optional: Also log the full file details for debugging
    console.log('Selected file:', {
      id: file.id,
      name: file.name,
      url: file.url,
      cleanUrl: cleanUrl,
      size: file.size,
      path: file.path
    });
  };

  const clearSelection = () => {
    ctx.setFieldValue(ctx.fieldPath, '');
    setSelectedFile(null);
    console.log('Cleared selected file');
    ctx.notice('Selection cleared');
  };

  return (
    <Canvas ctx={ctx}>
      {!token && (
        <div style={{
          background: 'rgba(255,165,0,0.1)',
          border: '1px solid orange',
          padding: 12,
          borderRadius: 4,
          marginBottom: 16,
        }}>
          ⚠️ Please configure your HubSpot Access Token in the plugin settings first.
        </div>
      )}
      
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '500',
          fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: '28px',
          color: '#374151',
          margin: '0 0 8px 0'
        }}>
          HubSpot PDF Chooser
        </h2>
        <p style={{
          fontSize: '15px',
          fontWeight: '400',
          fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: '22px',
          color: '#6b7280',
          margin: '0 0 20px 0'
        }}>
          Search and select PDF files from your HubSpot account. Choose a file to store its URL in this field.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            color: '#999',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            🔍
          </div>
          <input
            type="text"
            name="query"
            id="query"
            placeholder="Search through all loaded PDFs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading || allFiles.length === 0}
            style={{
              width: '100%',
              paddingLeft: '48px',
              paddingRight: '16px',
              paddingTop: '14px',
              paddingBottom: '14px',
              height: '48px',
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              border: '1px solid #d1d5db',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              backgroundColor: loading || allFiles.length === 0 ? '#f9fafb' : '#ffffff'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div style={{ 
          fontSize: '15px', 
          color: '#666',
          padding: '8px 12px',
          backgroundColor: '#f8f8f8',
          borderRadius: '4px',
          marginTop: 8,
          fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: '400',
          lineHeight: '23px'
        }}>
          {/* First row: PDF count and refresh button */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: selectedFile ? '8px' : '0'
          }}>
            <div>
              {loading ? loadingProgress : 
               allFiles.length > 0 ? 
               `📁 ${allFiles.length} PDFs loaded • Showing ${filteredFiles.length} results` :
               'Loading PDFs on startup...'}
            </div>
            {!loading && allFiles.length > 0 && (
              <button
                onClick={forceRefresh}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: '400',
                  border: '1px solid #6b7280',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#6b7280';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.color = '#6b7280';
                }}
                title="Clear cache and reload all PDFs from HubSpot"
              >
                🔄 Refresh
              </button>
            )}
          </div>
          
          {/* Second row: Selected file info and actions */}
          {selectedFile && (
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '15px', 
              color: '#0f5132', 
              fontWeight: '400',
              fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '23px'
            }}>
              <div>
                ✅ Selected: {selectedFile.name}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={clearSelection}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontWeight: '400',
                    border: '1px solid #dc2626',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none',
                    minWidth: '80px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#dc2626';
                    e.target.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.color = '#dc2626';
                  }}
                  title="Clear selected file"
                >
                  ✕ Clear
                </button>
                <button
                  onClick={() => window.open(selectedFile.url, '_blank')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontWeight: '400',
                    border: '1px solid #0066cc',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#0066cc',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none',
                    minWidth: '80px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0066cc';
                    e.target.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.color = '#0066cc';
                  }}
                  title="Open PDF in new tab"
                >
                  👁️ Preview
                </button>
              </div>
            </div>
          )}
          
          {/* Debug: Always show selectedFile state */}
          {console.log('Render selectedFile:', selectedFile ? selectedFile.name : 'null')}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spinner size={32} />
        </div>
      )}

      {error && (
        <div style={{ 
          color: 'red', 
          background: 'rgba(255,0,0,0.1)', 
          padding: 12, 
          borderRadius: 4,
          marginBottom: 16 
        }}>
          Error: {error}
        </div>
      )}

      {!loading && filteredFiles.length > 0 && (
        <div>
          {/* Pagination info and controls */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px',
            fontSize: '15px',
            color: '#666',
            fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: '400',
            lineHeight: '23px'
          }}>
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredFiles.length)} of {filteredFiles.length} results
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: '400',
                  border: '1px solid #6b7280',
                  borderRadius: '4px',
                  backgroundColor: currentPage === 1 ? '#f9fafb' : '#ffffff',
                  color: currentPage === 1 ? '#9ca3af' : '#6b7280',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.backgroundColor = '#6b7280';
                    e.target.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.color = '#6b7280';
                  }
                }}
              >
                ← Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: '400',
                  border: '1px solid #6b7280',
                  borderRadius: '4px',
                  backgroundColor: currentPage === totalPages ? '#f9fafb' : '#ffffff',
                  color: currentPage === totalPages ? '#9ca3af' : '#6b7280',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.backgroundColor = '#6b7280';
                    e.target.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.color = '#6b7280';
                  }
                }}
              >
                Next →
              </button>
            </div>
          </div>

          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '15px',
            tableLayout: 'fixed',
            fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: '23px'
          }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'left', 
                  width: '75%',
                  fontSize: '15px',
                  fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: '400',
                  lineHeight: '23px'
                }}>File Details</th>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'center', 
                  width: '25%',
                  fontSize: '15px',
                  fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: '400',
                  lineHeight: '23px'
                }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentPageFiles.map(file => (
                <tr key={file.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 8px', maxWidth: '0', overflow: 'hidden' }}>
                    <div style={{ 
                      fontWeight: '400', 
                      marginBottom: '4px',
                      fontSize: '15px',
                      fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      lineHeight: '23px'
                    }}>
                      {file.name}
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#0066cc',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      wordBreak: 'break-all',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={file.url}
                    >
                      {file.url}
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button
                      onClick={() => selectFile(file)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontFamily: 'colfax-web, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontWeight: '400',
                        border: '1px solid #059669',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#059669',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none',
                        minWidth: '80px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#059669';
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.color = '#059669';
                      }}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filteredFiles.length === 0 && allFiles.length > 0 && query && (
        <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
          No PDFs found matching "{query}". Try a different search term or clear the search to see all {allFiles.length} PDFs.
        </div>
      )}

      {!loading && allFiles.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
          No PDFs loaded yet. Check your HubSpot API token configuration.
        </div>
      )}
    </Canvas>
  );
}