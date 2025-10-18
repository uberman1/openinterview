# Enhanced Profile Editor Integration Guide

## Status: Partially Integrated ⚠️

The enhanced profile editor binder (`public/js/profile_edit.bind.js`) has been created and is ready to use, but **not yet integrated** into the existing profile edit page.

## What's Delivered

### ✅ Completed Components

1. **Enhanced Profile Editor Binder** (`public/js/profile_edit.bind.js`, 677 lines)
   - GPT-powered resume auto-population
   - Inline availability management
   - Unified resume/attachments handling
   - Social media field management
   - Highlights editor
   - All adapted to work with existing data-store.js API

2. **Backend AI Extraction Endpoint** (`/api/ai/extract_profile`)
   - Mock implementation ready
   - Structured to accept resume files
   - Returns extracted profile data (name, title, location, summary, highlights, social links)
   - TODO: Replace mock with actual OpenAI/Anthropic integration

3. **Helper Functions**
   - `pickFile()` - Single file picker
   - `pickFiles()` - Multiple file picker
   - `fakeUpload()` - Mock file upload with progress
   - `analyzeResumeAndPopulate()` - AI extraction integration

## Integration Challenge

### The Problem

The existing `public/profile_edit.html` has a **simple structure** with:
- Basic inputs (title, city, about, video)
- Links section
- Resume selection (radio buttons from library)
- Attachments (assign/unassign from library)

The new `profile_edit.bind.js` expects a **comprehensive structure** with:
- Resume import UI (`#resumeImportSource` select dropdown)
- Upload button (`#uploadResumeBtn`)
- Availability section (`#availabilityCalendar`, weekly schedule)
- Social media inputs (`#linkedinInput`, `#portfolioInput`, `#githubInput`)
- Highlights textarea (`#highlightsInput`)
- Attachments UI with multiple file upload

### Data Model Mismatch

**Current Model:**
```javascript
{
  resumeFileId: "f_123...",      // Single file ID reference
  attachmentFileIds: ["f_456..."] // Array of file ID references
}
```

**Enhanced Binder Expects:**
```javascript
{
  resume: {
    url: "/uploads/resume.pdf",
    name: "John-Doe-Resume.pdf"
  },
  attachments: [{
    url: "/uploads/doc.pdf",
    name: "Document.pdf"
  }]
}
```

## Integration Options

### Option 1: Create New Enhanced Profile Editor Page ✨ (Recommended)

Create a new comprehensive profile editor page with all sections:

1. Create `public/profile_edit_enhanced.html` with:
   ```html
   <!-- Resume Import Section -->
   <div id="resumeImportSection">
     <select id="resumeImportSource">
       <option value="">Select resume source...</option>
       <option value="upload">Upload New Resume</option>
       <option value="library">Choose from Library</option>
     </select>
     <button id="uploadResumeBtn">Upload Resume</button>
   </div>

   <!-- Social Media Section -->
   <div id="socialMediaSection">
     <input id="linkedinInput" placeholder="LinkedIn URL">
     <input id="portfolioInput" placeholder="Portfolio URL">
     <input id="githubInput" placeholder="GitHub URL">
   </div>

   <!-- Highlights Section -->
   <div id="highlightsSection">
     <textarea id="highlightsInput" rows="6"></textarea>
   </div>

   <!-- Availability Section -->
   <div id="availabilitySection">
     <div id="availabilityCalendar">
       <!-- Weekly schedule grid -->
     </div>
   </div>

   <!-- Script Integration -->
   <script type="module" src="/js/data-store.js"></script>
   <script type="module" src="/js/profile_edit.bind.js"></script>
   ```

2. Add route in `index.js`:
   ```javascript
   app.get("/profile_edit_enhanced.html", (req, res) => {
     res.sendFile(path.join(__dirname, "public", "profile_edit_enhanced.html"));
   });
   ```

3. Update navigation to point to new page

### Option 2: Extend Existing Profile Editor 🔧

Add missing sections to `public/profile_edit.html`:

1. Add HTML sections (resume import, social media, highlights, availability)
2. Update data model to support both formats
3. Add adapter layer in binder for backwards compatibility
4. Integrate `profile_edit.bind.js`

### Option 3: Gradual Migration 📦

1. Keep existing profile_edit.html as-is
2. Use new enhanced editor for NEW profiles only
3. Migrate existing profiles over time
4. Deprecate old editor after migration complete

## Next Steps

### For Immediate Use

1. Choose integration option (Option 1 recommended)
2. Create HTML structure matching binder expectations
3. Test with new profiles
4. Validate AI extraction workflow
5. Replace mock AI implementation with production API

### For Production Deployment

1. **Add OpenAI/Anthropic Integration:**
   ```javascript
   // In index.js, replace mock implementation
   import OpenAI from 'openai';
   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
   
   app.post("/api/ai/extract_profile", upload.single("file"), async (req, res) => {
     const text = await extractTextFromPDF(req.file.buffer);
     const completion = await openai.chat.completions.create({
       model: "gpt-4",
       messages: [{
         role: "system",
         content: "Extract profile information from this resume..."
       }, {
         role: "user",
         content: text
       }]
     });
     res.json(JSON.parse(completion.choices[0].message.content));
   });
   ```

2. **Environment Variables:**
   ```bash
   OPENAI_API_KEY=sk-...
   # OR
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Testing:**
   - Test with various resume formats (PDF, DOCX, TXT)
   - Validate extraction accuracy
   - Handle edge cases (malformed PDFs, etc.)
   - Test file size limits

## File Structure

```
public/
├── js/
│   ├── profile_edit.bind.js    ✅ Enhanced editor binder (ready)
│   ├── data-store.js           ✅ localStorage wrapper (compatible)
│   └── asset-library.js        ✅ File management (compatible)
├── profile_edit.html           ⚠️  Simple editor (current)
└── profile_edit_enhanced.html  ❌ Comprehensive editor (needed)

index.js                         ✅ Backend routes (ready)
├── /api/ai/extract_profile     ✅ AI extraction endpoint (mock)
├── /api/upload/...             ✅ File upload (ready)
└── /profile_edit_enhanced      ❌ New route (needed)
```

## Benefits of Enhanced Editor

Once integrated, users will have:

1. **🤖 AI-Powered Auto-Population:** Upload resume → auto-fill profile fields
2. **📅 Inline Availability:** Manage availability without leaving profile editor
3. **📎 Unified Attachments:** Upload multiple files at once
4. **🔗 Social Media Integration:** LinkedIn, Portfolio, GitHub fields
5. **✨ Highlights Editor:** Bullet-point highlights with auto-extraction
6. **💾 Auto-Save:** LocalStorage persistence with version control

## Technical Considerations

### Browser Compatibility
- File API support (modern browsers)
- LocalStorage (all browsers)
- Async/await (all modern browsers)

### Performance
- LocalStorage has 5-10MB limit
- Large files should use backend upload, not base64 in localStorage
- Consider IndexedDB for larger file handling

### Security
- Validate all file uploads on backend
- Sanitize AI-extracted content before rendering
- Rate-limit AI extraction endpoint
- Implement proper authentication for edit pages

## Questions?

Contact the development team or review:
- `public/js/profile_edit.bind.js` - Full implementation
- `index.js` (lines 432-470) - AI extraction endpoint
- `CHANGELOG.md` - Recent changes and deployment history
