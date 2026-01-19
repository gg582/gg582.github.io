module Jekyll
  class SubcategoryPageGenerator < Generator
    safe true
    priority :low

    def generate(site)
      # Get all category pages that have subcategories defined
      category_pages = site.pages.select do |page|
        page.data['subcategories'] && page.data['category_id']
      end

      category_pages.each do |category_page|
        category_id = category_page.data['category_id']
        subcategories = category_page.data['subcategories']

        subcategories.each do |subcat|
          # Find all documents that belong to this subcategory
          subcat_docs = site.documents.select do |doc|
            doc.data['taxonomy'] && 
            doc.data['taxonomy']['subcategory'] == subcat['id']
          end

          # Only create a page if there's at least one document in this subcategory
          if subcat_docs.size > 0
            # Create a new page for this subcategory
            site.pages << SubcategoryPage.new(
              site, 
              site.source, 
              category_id, 
              subcat, 
              category_page.data['category_name']
            )
          end
        end
      end
    end
  end

  class SubcategoryPage < Page
    def initialize(site, base, category_id, subcat, category_name)
      @site = site
      @base = base
      @dir = File.join('분류', category_id, subcat['id'])
      @name = 'index.html'

      self.process(@name)
      self.read_yaml(File.join(base, '_layouts'), 'subcategory.html')
      
      self.data['category_id'] = category_id
      self.data['category_name'] = category_name
      self.data['subcategory_id'] = subcat['id']
      self.data['subcategory_name'] = subcat['name']
      self.data['subcategory_description'] = subcat['description']
      self.data['title'] = "#{subcat['name']} - #{category_name}"
    end
  end
end
