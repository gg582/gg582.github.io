module Jekyll
  module TagFilter
    # Returns HTML string of tags found at the beginning of the string
    # e.g. "[Tag1][Tag2] Title" -> "<span ...>Tag1</span><span ...>Tag2</span>"
    def render_title_tags(input)
      return "" unless input.is_a?(String)
      
      # Match all leading tags (e.g., [Tag1], [Tag2]...)
      # The regex ^((?:\[[^\]]+\]\s*)+) captures the entire sequence of tags at the start
      full_match = input.match(/^((?:\[[^\]]+\]\s*)+)/)
      return "" unless full_match
      
      tag_string = full_match[0]
      # Extract individual tags content
      individual_tags = tag_string.scan(/\[([^\]]+)\]/).flatten
      
      html = ""
      individual_tags.each do |tag|
        html += "<span class=\"title-tag-badge\">#{tag.strip}</span>"
      end
      html
    end

    # Returns the title without the leading tags
    def clean_title_tags(input)
       return input unless input.is_a?(String)
       # Remove the leading sequence of tags
       input.sub(/^((?:\[[^\]]+\]\s*)+)/, '').strip
    end
  end
end

Liquid::Template.register_filter(Jekyll::TagFilter)
