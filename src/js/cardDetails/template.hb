<header class="siteheader group">
<!-- Navigasjon, logo etc -->
  <h1 class="logo">BEKKUU logo!</h1>

<a href="/" class="closebtn">
  <span class="visuallyhidden">Tilbake til forside</span>
</a>

</header>




<article class="detail">

  <header>
      <h1 class="decorated">{{Skjemaer}}</h1>
      <p class="lead">{{preface}}</p>
  </header>

  <figure>
    <img src="{{figure}}" alt="Katt"/>
  </figure>


  <div class="article-body">
    {{{body}}}
  </div>
  <aside>
    <section>
      <h2>Referanser og ressurser</h2>
      <ul>
        {{#each reference}}
          <li>
            <a href="{{url}}">
              {{title}}
            </a>
          </li>
        {{/each}}
      </ul>
    </section>

    <section>
      <h2>
        Relevante og beslektede temaer
      </h2>

      <ul>
      {{#each relevant}}
        <li>
          <a href="{{url}}">
            {{title}}
          </a>
        </li>
      {{/each}}
      </ul>

    </section>
  </aside>

</article>