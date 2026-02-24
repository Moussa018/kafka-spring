package com.example.auth.springkafka.handlers;

import com.example.auth.springkafka.events.PageEvent;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.KeyValue;
import org.apache.kafka.streams.kstream.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.stream.binder.kafka.streams.InteractiveQueryService;
import org.apache.kafka.streams.state.KeyValueIterator;
import org.apache.kafka.streams.state.QueryableStoreTypes;
import org.apache.kafka.streams.state.ReadOnlyWindowStore;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

import static org.springframework.integration.graph.LinkNode.Type.input;

@Component
@RestController
public class PageEventHandler {
    @Autowired
    private StreamBridge streamBridge;
    @Autowired
    private InteractiveQueryService interactiveQueryService;
    @Bean
      public Consumer<PageEvent> pageEventConsumer(){
          return (input) -> {
              System.out.println("************");
              System.out.println(input.toString());
              System.out.println("************");
          };
      }


      @Bean
    public Supplier<PageEvent> pageEventSupplier(){
        return () -> {
           return new PageEvent(
                   Math.random()>0.5?"P1":"P2",
                   Math.random()>0.5?"U1":"U2",
                   new Date(),
                    new Random().nextInt(10000)
           );
        };
      }


    @Bean
    public Function<KStream<String, PageEvent>, KStream<String, Long>> kStreamKStreamFunction() {
        return (input) ->
                input
                        .filter((k, v) -> v.duration() > 100)
                        .map((k, v) -> new KeyValue<>(v.name(), v.duration()))
                        .groupByKey(Grouped.with(Serdes.String(), Serdes.Long()))
                        .windowedBy(
                                TimeWindows.ofSizeAndGrace(
                                        Duration.ofSeconds(5),       // ✅ Fenêtre de 5 secondes
                                        Duration.ofSeconds(1)        // ✅ Grace period de 1 seconde
                                )
                        )
                        .count(Materialized.as("count-store"))
                        .toStream()
                        .map((k, v) -> new KeyValue<>(k.key(), v));
    }
    @GetMapping(path = "/analytics",produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Map<String, Long>> analytics(){
        return Flux.interval(Duration.ofSeconds(1))
                .map(sequence->{
                    Map<String,Long> stringLongMap=new HashMap<>();
                    ReadOnlyWindowStore<String, Long> windowStore = interactiveQueryService.getQueryableStore("count-store", QueryableStoreTypes.windowStore());
                    Instant now=Instant.now();
                    Instant from=now.minusMillis(5000);
                    KeyValueIterator<Windowed<String>, Long> fetchAll = windowStore.fetchAll(from, now);
                    //WindowStoreIterator<Long> fetchAll = windowStore.fetch(page, from, now);
                    while (fetchAll.hasNext()){
                        KeyValue<Windowed<String>, Long> next = fetchAll.next();
                        stringLongMap.put(next.key.key(),next.value);
                    }
                    return stringLongMap;
                });
    }


}
