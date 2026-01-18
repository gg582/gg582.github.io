require 'nokogiri'

Jekyll::Hooks.register :posts, :post_render do |post|
  # Only process posts that have a 'toc' variable set to true in their front matter
  if post.data['toc']
    doc = Nokogiri::HTML.fragment(post.content)
    toc_html = '<div class="toc"><h4>목차</h4><ul>'
    
    headers = doc.css('h2, h3, h4')
    
    # Return if there are no headers to create a TOC from
    next if headers.empty?

    headers.each do |header|
      # Generate a unique ID for the header
      id = header.text.downcase.strip.gsub(' ', '-').gsub(/[^\w-]/, '')
      
      # Add an anchor link to the header
      header['id'] = id
      
      # Add the header to the TOC
      indent_level = header.name[1].to_i - 2
      toc_html += '<li style="margin-left: #{indent_level * 20}px;">'
      toc_html += "<a href=\"##{id}\">#{header.text}</a>"
      toc_html += '</li>'
    end
    
    toc_html += '</ul></div>'
    
    # Prepend the TOC to the post content
    post.content = toc_html + doc.to_html
  end
end
