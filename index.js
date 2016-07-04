var lunr = require('lunr');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var $ = require('cheerio');

var supportLangs = ['da', 'de', 'du', 'es', 'fi', 'fr', 'hu', 'it', 'jp', 'no', 'pt', 'ro', 'ru', 'sv', 'tr'];
var searchLanguages = {};
var searchIndex = {};
var searchStore = {};

module.exports = {
    book: {
        assets: './assets',
        js: ['lunr.stemmer.support.js', 'lunr.jp.js'] // FIXME jp only
    },

    hooks: {
        "init": function() {
            var lang;
            var isSkip;
            if (this.options.generator != 'website') return;
            searchLanguages = {};
            searchLanguages.lang = lang = this.config.options.pluginsConfig.search_languages.lang;
            searchLanguages.isSkip
                = isSkip = (!lang || lang === 'en' || !_.any(supportLangs, function(lng) { return lng === lang }));
            if (isSkip) {
                this.log.warn.ln('[search-languages] not support language : ' + lang);
                return;
            }

            require('./assets/lunr.stemmer.support')(lunr);
            require('./assets/lunr.' + lang)(lunr);
            // Create search index
            searchIndex = lunr(function () {
                this.ref('url');
                this.use(lunr[lang]);
                this.field('title', { boost: 10 });
                this.field('body');
            });
        },
        // Index each page
        "page": function(page) {
            if (this.options.generator != 'website') return page;
            if (searchLanguages.isSkip) return page;

            var lang = searchLanguages.lang;
            // if (_.any(supportLangs, function(lng) { return lng === lang })) {
            // Extract HTML
            var html = _.pluck(page.sections, 'content').join(' ');

            // Transform as TEXT
            var text = $('<p>' + html.replace(/(<([^>]+)>)/ig, '') + '</p>').text();

            // Add to index
            searchIndex.add({
                url: this.contentLink(page.path),
                title: $('<p>' + page.progress.current.title + '</p>').text(),
                body: text
            })
            // }

            // Add to store
            searchStore[this.contentLink(page.path)] = {
                url: this.contentLink(page.path),
                title: $('<p>' + page.progress.current.title + '</p>').text(),
                body: text
            };
            return page;
        },

        // Write index to disk
        "finish": function() {
            this.log.warn.ln('[search-languages] skipping some checks');
            // if (this.options.generator != 'website') return;
            // if (searchLanguages.isSkip) return;
            fs.writeFileSync(
                path.join(this.options.output, "search_index.json"),
                JSON.stringify(
                    {
                        index: searchIndex,
                        store: searchStore
                    }
                )
            );
        }
    }
};

